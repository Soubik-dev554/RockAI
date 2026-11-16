const INPUT_SAMPLE_RATE = 16000;
const CHUNKS_PER_PACKET = 3;

let audioContext = null;
let mediaStream = null;
let microphoneSource = null;
let processorNode = null;
let silentGainNode = null;

let microphoneActive = false;
let microphoneMuted = false;
let pendingPcmChunks = [];
let currentMicrophoneLevel = 0;

// Normalized RMS level (0..1) from the active microphone PCM stream.
export const getMicrophoneLevel = () => {
    return microphoneActive && !microphoneMuted
        ? currentMicrophoneLevel
        : 0;
};

// Convert ArrayBuffer to Base64
export const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
};

// Get available microphones
export const enumerateAudioInputDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
        throw new Error("Audio device selection is not supported.");
    }

    const devices = await navigator.mediaDevices.enumerateDevices();

    return devices
        .filter(device => device.kind === "audioinput")
        .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${index + 1}`,
            kind: device.kind
        }));
};

// Calculate normalized RMS level from Int16 PCM.
const calculateRmsLevel = (pcmData) => {
    if (!pcmData.length) return 0;

    let sumSquares = 0;

    for (let i = 0; i < pcmData.length; i++) {
        const sample = pcmData[i] / 32768;
        sumSquares += sample * sample;
    }

    const rms = Math.sqrt(sumSquares / pcmData.length);

    return Math.max(0, Math.min(1, rms * 5));
};

// Send microphone audio to Gemini
const sendAudioToGemini = (session, pcmChunks) => {
    if (!microphoneActive || !session || !pcmChunks.length) return;

    try {
        const totalSamples = pcmChunks.reduce(
            (total, chunk) => total + chunk.length,
            0
        );

        if (totalSamples === 0) return;

        const combinedAudio = new Int16Array(totalSamples);

        let offset = 0;

        for (const chunk of pcmChunks) {
            combinedAudio.set(chunk, offset);
            offset += chunk.length;
        }

        const base64Audio = arrayBufferToBase64(combinedAudio.buffer);

        session.sendRealtimeInput({
            audio: {
                data: base64Audio,
                mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`
            }
        });

    } catch (error) {
        if (microphoneActive) {
            console.error("Audio sending failed:", error);
        }
    }
};

// Release microphone resources without closing Gemini session
const releaseMicrophoneResources = async () => {
    microphoneActive = false;
    currentMicrophoneLevel = 0;
    pendingPcmChunks = [];

    if (processorNode) {
        processorNode.port.onmessage = null;
        processorNode.disconnect();
        processorNode = null;
    }

    if (microphoneSource) {
        microphoneSource.disconnect();
        microphoneSource = null;
    }

    if (silentGainNode) {
        silentGainNode.disconnect();
        silentGainNode = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    if (audioContext) {
        const contextToClose = audioContext;
        audioContext = null;

        try {
            await contextToClose.close();
        } catch (error) {
            console.warn("AudioContext cleanup:", error);
        }
    }
};

// Start microphone with optional device ID
export const startMicrophone = async (
    session,
    onError,
    deviceId = ""
) => {
    try {
        if (microphoneActive || mediaStream) {
            console.warn("Microphone is already active.");
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Microphone access requires HTTPS or localhost.");
        }

        const audioConstraints = {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        };

        if (deviceId) {
            audioConstraints.deviceId = { exact: deviceId };
        }

        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints
        });

        const tracks = mediaStream.getAudioTracks();

        if (!tracks.length) {
            throw new Error("No microphone track found.");
        }

        tracks.forEach(track => {
            track.enabled = !microphoneMuted;
        });

        audioContext = new AudioContext({
            sampleRate: INPUT_SAMPLE_RATE
        });

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        if (audioContext.sampleRate !== INPUT_SAMPLE_RATE) {
            throw new Error(
                `Expected ${INPUT_SAMPLE_RATE}Hz audio, but received ${audioContext.sampleRate}Hz.`
            );
        }

        await audioContext.audioWorklet.addModule("/audio-processor.js");

        microphoneSource = audioContext.createMediaStreamSource(mediaStream);

        processorNode = new AudioWorkletNode(
            audioContext,
            "rockai-audio-processor"
        );

        microphoneActive = true;
        pendingPcmChunks = [];
        currentMicrophoneLevel = 0;

        processorNode.port.onmessage = (event) => {
            if (!microphoneActive || !session || !event.data) return;

            if (!(event.data instanceof ArrayBuffer)) {
                console.error("Unexpected audio format:", event.data);
                return;
            }

            const buffer = event.data;

            if (buffer.byteLength === 0) return;

            const pcmData = new Int16Array(buffer);

            if (pcmData.length === 0) return;

            currentMicrophoneLevel = microphoneMuted
                ? 0
                : calculateRmsLevel(pcmData);

            pendingPcmChunks.push(pcmData);

            if (pendingPcmChunks.length >= CHUNKS_PER_PACKET) {
                const chunksToSend = pendingPcmChunks;
                pendingPcmChunks = [];

                sendAudioToGemini(session, chunksToSend);
            }
        };

        microphoneSource.connect(processorNode);

        silentGainNode = audioContext.createGain();
        silentGainNode.gain.value = 0;

        processorNode.connect(silentGainNode);
        silentGainNode.connect(audioContext.destination);

    } catch (error) {
        console.error("Microphone error:", error);

        await releaseMicrophoneResources();

        onError?.(error);

        throw error;
    }
};

// Switch microphone without disconnecting Gemini
export const switchMicrophone = async (
    session,
    deviceId,
    onError
) => {
    if (!session) {
        throw new Error("No active Gemini session found.");
    }

    if (!deviceId) {
        throw new Error("Invalid microphone selection.");
    }

    try {
        const wasMuted = microphoneMuted;

        await releaseMicrophoneResources();

        microphoneMuted = wasMuted;

        await startMicrophone(session, onError, deviceId);

    } catch (error) {
        console.error("Microphone switching failed:", error);
        throw error;
    }
};

// Mute or unmute microphone
export const setMicrophoneMuted = (muted) => {
    microphoneMuted = muted;

    if (muted) {
        currentMicrophoneLevel = 0;
    }

    if (mediaStream) {
        mediaStream.getAudioTracks().forEach(track => {
            track.enabled = !muted;
        });
    }
};

// Stop microphone
export const stopMicrophone = async () => {
    await releaseMicrophoneResources();
};
