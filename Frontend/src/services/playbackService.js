const OUTPUT_SAMPLE_RATE = 24000;

export class AudioPlayer {
    constructor() {
        this.audioContext = null;
        this.gainNode = null;
        this.analyserNode = null;
        this.analyserData = null;

        this.nextStartTime = 0;
        this.activeSources = new Set();
        this.isMuted = false;

        this.selectedOutputDeviceId =
            localStorage.getItem("rockai_speaker_id") || "";
    }

    async getOutputDevices() {
        if (!navigator.mediaDevices?.enumerateDevices) {
            throw new Error("Audio device enumeration is not supported.");
        }

        const devices = await navigator.mediaDevices.enumerateDevices();

        return devices
            .filter(device => device.kind === "audiooutput")
            .map((device, index) => ({
                deviceId: device.deviceId,
                label: device.label || `Speaker ${index + 1}`,
                kind: device.kind
            }));
    }

    supportsOutputSelection() {
        return Boolean(
            this.audioContext &&
            typeof this.audioContext.setSinkId === "function"
        );
    }

    isOutputSelectionSupported() {
        return this.supportsOutputSelection();
    }

    async setOutputDevice(deviceId) {
        await this.initialize();

        if (!this.supportsOutputSelection()) {
            throw new Error(
                "Your browser does not support direct speaker selection. Please change the output device using your device settings."
            );
        }

        await this.audioContext.setSinkId(deviceId || "");

        this.selectedOutputDeviceId = deviceId || "";

        if (deviceId) {
            localStorage.setItem("rockai_speaker_id", deviceId);
        } else {
            localStorage.removeItem("rockai_speaker_id");
        }
    }

    async initialize() {
        if (!this.audioContext || this.audioContext.state === "closed") {
            this.audioContext = new AudioContext({
                sampleRate: OUTPUT_SAMPLE_RATE
            });

            this.gainNode = this.audioContext.createGain();

            this.analyserNode = this.audioContext.createAnalyser();

            this.analyserNode.fftSize = 256;
            this.analyserNode.smoothingTimeConstant = 0.72;

            this.analyserData = new Uint8Array(
                this.analyserNode.fftSize
            );

            this.gainNode.connect(this.analyserNode);
            this.analyserNode.connect(this.audioContext.destination);

            this.nextStartTime = this.audioContext.currentTime;

            if (
                this.selectedOutputDeviceId &&
                this.supportsOutputSelection()
            ) {
                try {
                    await this.audioContext.setSinkId(
                        this.selectedOutputDeviceId
                    );

                } catch (error) {
                    console.warn(
                        "Saved speaker unavailable. Using default output.",
                        error
                    );

                    this.selectedOutputDeviceId = "";

                    localStorage.removeItem("rockai_speaker_id");
                }
            }
        }

        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }
    }

    // Returns normalized audible output RMS level (0..1).
    getOutputLevel() {
        if (
            !this.audioContext ||
            !this.analyserNode ||
            !this.analyserData ||
            this.audioContext.state !== "running" ||
            this.isMuted
        ) {
            return 0;
        }

        this.analyserNode.getByteTimeDomainData(this.analyserData);

        let sumSquares = 0;

        for (let i = 0; i < this.analyserData.length; i++) {
            const sample = (this.analyserData[i] - 128) / 128;

            sumSquares += sample * sample;
        }

        const rms = Math.sqrt(
            sumSquares / this.analyserData.length
        );

        return Math.max(0, Math.min(1, rms * 5));
    }

    base64ToPCM(base64) {
        const binary = atob(base64);

        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return new Int16Array(
            bytes.buffer,
            bytes.byteOffset,
            Math.floor(bytes.byteLength / 2)
        );
    }

    async playAudio(base64Audio) {
        await this.initialize();

        const pcmData = this.base64ToPCM(base64Audio);

        if (pcmData.length === 0) return;

        const audioBuffer = this.audioContext.createBuffer(
            1,
            pcmData.length,
            OUTPUT_SAMPLE_RATE
        );

        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < pcmData.length; i++) {
            channelData[i] = pcmData[i] / 32768;
        }

        const source = this.audioContext.createBufferSource();

        source.buffer = audioBuffer;

        source.connect(this.gainNode);

        const startTime = Math.max(
            this.audioContext.currentTime,
            this.nextStartTime
        );

        this.nextStartTime = startTime + audioBuffer.duration;

        this.activeSources.add(source);

        source.onended = () => {
            this.activeSources.delete(source);
            source.disconnect();
        };

        source.start(startTime);
    }

    setMuted(muted) {
        this.isMuted = muted;

        if (this.gainNode && this.audioContext) {
            this.gainNode.gain.setTargetAtTime(
                muted ? 0 : 1,
                this.audioContext.currentTime,
                0.01
            );
        }
    }

    stop() {
        if (!this.audioContext) return;

        this.activeSources.forEach(source => {
            try {
                source.stop();
                source.disconnect();

            } catch {
                // Source may already have stopped.
            }
        });

        this.activeSources.clear();

        this.nextStartTime = this.audioContext.currentTime;
    }

    async close() {
        this.stop();

        if (this.audioContext) {
            await this.audioContext.close();

            this.audioContext = null;
            this.gainNode = null;
            this.analyserNode = null;
            this.analyserData = null;
            this.nextStartTime = 0;
        }
    }
}
