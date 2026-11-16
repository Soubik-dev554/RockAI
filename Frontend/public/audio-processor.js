/* global AudioWorkletProcessor, registerProcessor */

class RockAIAudioProcessor extends AudioWorkletProcessor {
    process(inputs) {
        const input = inputs[0];

        if (input && input[0]) {
            const audioData = input[0];
            const pcmData = new Int16Array(audioData.length);

            for (let i = 0; i < audioData.length; i++) {
                const sample = Math.max(-1, Math.min(1, audioData[i]));

                pcmData[i] = sample < 0
                    ? sample * 32768
                    : sample * 32767;
            }

            this.port.postMessage(
                pcmData.buffer,
                [pcmData.buffer]
            );
        }

        return true;
    }
}

registerProcessor("rockai-audio-processor", RockAIAudioProcessor);