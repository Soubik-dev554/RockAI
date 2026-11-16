import { useState, useRef, useEffect, useCallback } from "react";
import { connectGeminiLive } from "../services/geminiLiveService";
import { useNavigate } from "react-router-dom";
import { getCurrentLocation } from "../services/locationService";
import { getCurrentWeather } from "../services/weatherService";
import { getWeatherByCity } from "../services/weatherService";
import { getLatestNews } from "../services/newsService";
import {
    createVoiceConversation,
    saveVoiceMessage,
    getVoiceConversations,
    getVoiceConversation,
    deleteVoiceConversation
} from "../services/voiceService";

import {
    startMicrophone,
    stopMicrophone,
    setMicrophoneMuted,
    switchMicrophone,
    getMicrophoneLevel
} from "../services/audioService";

import { AudioPlayer } from "../services/playbackService";

function VoiceMode() {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
    const [showTranscript, setShowTranscript] = useState(true);
    const [transcript, setTranscript] = useState([]);
    const [mobileMenu, setMobileMenu] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState("Ready to connect");
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);

    // Audio device preferences
    const [audioInputDevices, setAudioInputDevices] = useState([]);
    const [audioOutputDevices, setAudioOutputDevices] = useState([]);
    const [selectedMicrophoneId, setSelectedMicrophoneId] = useState(
        () => localStorage.getItem("rockai_microphone_id") || ""
    );
    const [selectedSpeakerId, setSelectedSpeakerId] = useState(
        () => localStorage.getItem("rockai_speaker_id") || ""
    );
    const [isChangingMicrophone, setIsChangingMicrophone] = useState(false);
    const [deviceMessage, setDeviceMessage] = useState("");
    const [speakerSelectionSupported, setSpeakerSelectionSupported] = useState(false);
    const navigate = useNavigate();

    // History states
    const [activeView, setActiveView] = useState("voice");
    const [voiceHistory, setVoiceHistory] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    // Refs
    const sessionRef = useRef(null);
    const connectingRef = useRef(false);
    const audioPlayerRef = useRef(new AudioPlayer());
    const transcriptContainerRef = useRef(null);
    const conversationIdRef = useRef(null);

    const transcriptRef = useRef([]);
    const pendingMessageRef = useRef(null);
    const saveQueueRef = useRef(Promise.resolve());

    // Avatar speaking indicator (driven by incoming assistant transcript chunks).
    const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
    const speakingTimerRef = useRef(null);
    const [visualizerLevel, setVisualizerLevel] = useState(0);
    const [visualizerSource, setVisualizerSource] = useState("idle");

    const handleGeminiToolCall = async (toolCall, session) => {
        const functionResponses = [];

        for (const call of toolCall.functionCalls || []) {
            let result;

            try {
                // 1. Get current location
                if (call.name === "get_current_location") {
                    const location = await getCurrentLocation();

                    result = {
                        success: true,
                        location
                    };
                }

                // 2. Get current weather
                else if (call.name === "get_current_weather") {
                    const location = await getCurrentLocation();

                    const weather = await getCurrentWeather(
                        location.latitude,
                        location.longitude
                    );

                    result = {
                        success: true,
                        location: {
                            village: location.village,
                            town: location.town,
                            district: location.district,
                            state: location.state,
                            country: location.country
                        },
                        weather
                    };
                }
                // specific city by name.
                else if (call.name === "get_weather_by_city") {
                    const city = call.args?.city;

                    const weather = await getWeatherByCity(city);

                    result = weather;
                }

                //3. get leatest new.
                // 4. Get latest news
                else if (call.name === "get_latest_news") {
                    const {
                        topic = "India",
                        timespan = "24h",
                        limit = 5
                    } = call.args || {};

                    const news = await getLatestNews({
                        topic,
                        timespan,
                        limit
                    });

                    result = news;
                }

                // 4. Unknown function
                else {
                    result = {
                        success: false,
                        error: `Unknown function: ${call.name}`
                    };
                }

            } catch (error) {
                console.error("Tool execution error:", error);

                result = {
                    success: false,
                    error: error.message
                };
            }

            functionResponses.push({
                id: call.id,
                name: call.name,
                response: result
            });
        }

        // Send tool results back to Gemini
        if (functionResponses.length) {
            session.sendToolResponse({
                functionResponses
            });
        }
    };

    // Read actual microphone and speaker output levels for the live visualizer.
    useEffect(() => {
        let animationFrameId;
        let lastUpdateAt = 0;

        const updateLevels = (timestamp) => {
            if (timestamp - lastUpdateAt >= 45) {
                lastUpdateAt = timestamp;

                const microphoneLevel =
                    isConnected && !isMuted && !isPaused
                        ? getMicrophoneLevel()
                        : 0;

                const assistantLevel =
                    isConnected && !isSpeakerMuted
                        ? audioPlayerRef.current.getOutputLevel()
                        : 0;

                // Prefer the assistant output when both audio paths are active.
                const isAssistantActive = assistantLevel > 0.018;
                const activeLevel = isAssistantActive
                    ? assistantLevel
                    : microphoneLevel;

                setVisualizerSource(
                    isAssistantActive
                        ? "speaking"
                        : microphoneLevel > 0.018
                            ? "listening"
                            : "idle"
                );
                setVisualizerLevel(Math.min(1, activeLevel));
            }

            animationFrameId = requestAnimationFrame(updateLevels);
        };

        animationFrameId = requestAnimationFrame(updateLevels);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isConnected, isMuted, isPaused, isSpeakerMuted]);

    // Automatically scroll transcript container
    useEffect(() => {
        const container = transcriptContainerRef.current;

        if (!container) return;

        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });
    }, [transcript, showTranscript]);

    // Update transcript and merge consecutive chunks
    const updateTranscript = ({ role, text }) => {
        if (!text?.trim()) return;

        const pending = pendingMessageRef.current;

        if (pending && pending.role === role) {

            // Merge transcription chunks
            pending.text += text;

            const updated = [...transcriptRef.current];

            updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                text: pending.text
            };

            transcriptRef.current = updated;
            setTranscript(updated);

        } else {

            // Save previous completed message
            flushPendingMessage();

            // Start a new message
            const newMessage = {
                id: transcriptRef.current.length,
                role,
                text
            };

            pendingMessageRef.current = {
                role,
                text
            };

            const updated = [
                ...transcriptRef.current,
                newMessage
            ];

            transcriptRef.current = updated;
            setTranscript(updated);
        }
    };

    // Save completed message to MongoDB
    const flushPendingMessage = () => {
        const pending = pendingMessageRef.current;

        if (!pending || !pending.text.trim()) return;

        const conversationId = conversationIdRef.current;

        // Clear immediately to prevent duplicate saves
        pendingMessageRef.current = null;

        if (!conversationId) return;

        const message = {
            role: pending.role,
            text: pending.text.trim()
        };

        // Queue saves so messages are stored in order
        saveQueueRef.current = saveQueueRef.current
            .then(() => {
                return saveVoiceMessage(
                    conversationId,
                    message.role,
                    message.text
                );
            })
            .catch((error) => {
                console.error("Voice message saving failed:", error);
            });
    };

    // Wait for pending database operations
    const waitForVoiceSaves = async () => {
        await saveQueueRef.current;
    };
    // Read available microphones and speakers exposed by this browser.
    const refreshAudioDevices = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.enumerateDevices) {
                setDeviceMessage("This browser does not expose audio device selection.");
                return;
            }

            const devices = await navigator.mediaDevices.enumerateDevices();

            const microphones = devices.filter(
                (device) => device.kind === "audioinput"
            );

            const speakers = devices.filter(
                (device) => device.kind === "audiooutput"
            );

            setAudioInputDevices(microphones);
            setAudioOutputDevices(speakers);

            setSpeakerSelectionSupported(
                typeof audioPlayerRef.current?.setOutputDevice === "function"
            );

            if (
                selectedMicrophoneId &&
                !microphones.some(
                    (device) => device.deviceId === selectedMicrophoneId
                )
            ) {
                setSelectedMicrophoneId("");
                localStorage.removeItem("rockai_microphone_id");
            }

            if (
                selectedSpeakerId &&
                !speakers.some(
                    (device) => device.deviceId === selectedSpeakerId
                )
            ) {
                setSelectedSpeakerId("");
                localStorage.removeItem("rockai_speaker_id");
            }
        } catch (error) {
            console.error("Unable to enumerate audio devices:", error);
            setDeviceMessage(
                "Unable to load audio devices. Check browser permissions."
            );
        }
    }, [selectedMicrophoneId, selectedSpeakerId]);

    // Refresh device list when the settings panel opens and when devices change.
    // Refresh device list when settings open and when devices change.
    useEffect(() => {
        if (!showVoiceSettings) return;

        // Defer the initial refresh until after the effect finishes.
        const timeoutId = setTimeout(() => {
            refreshAudioDevices();
        }, 0);

        const handleDeviceChange = () => {
            refreshAudioDevices();
        };

        navigator.mediaDevices?.addEventListener?.(
            "devicechange",
            handleDeviceChange
        );

        return () => {
            clearTimeout(timeoutId);

            navigator.mediaDevices?.removeEventListener?.(
                "devicechange",
                handleDeviceChange
            );
        };
    }, [showVoiceSettings, refreshAudioDevices]);
    // Switch microphones without closing the Gemini Live session.
    const handleMicrophoneChange = async (deviceId) => {
        setSelectedMicrophoneId(deviceId);
        setDeviceMessage("");

        if (deviceId) {
            localStorage.setItem("rockai_microphone_id", deviceId);
        } else {
            localStorage.removeItem("rockai_microphone_id");
        }

        if (!isConnected || !sessionRef.current) {
            setDeviceMessage("Microphone preference saved. It will be used next time you connect.");
            return;
        }

        try {
            setIsChangingMicrophone(true);
            setConnectionStatus("Switching microphone...");

            await switchMicrophone(
                sessionRef.current,
                deviceId || undefined,
                (error) => {
                    console.error("Microphone switch failed:", error);
                }
            );

            setMicrophoneMuted(isMuted || isPaused);
            setConnectionStatus(isPaused ? "Paused" : "Listening...");
            setDeviceMessage("Microphone changed successfully.");
            await refreshAudioDevices();
        } catch (error) {
            console.error("Unable to switch microphone:", error);
            setDeviceMessage(error.message || "Could not switch microphone.");
            setConnectionStatus("Microphone switch failed");
        } finally {
            setIsChangingMicrophone(false);
        }
    };

    // Select a speaker only when the AudioPlayer/browser supports output routing.
    const handleSpeakerChange = async (deviceId) => {
        if (typeof audioPlayerRef.current.setOutputDevice !== "function") {
            setDeviceMessage(
                "Direct speaker selection is not supported by this browser. Use your device's sound settings."
            );
            return;
        }

        try {
            await audioPlayerRef.current.setOutputDevice(deviceId || "");
            setSelectedSpeakerId(deviceId);
            if (deviceId) {
                localStorage.setItem("rockai_speaker_id", deviceId);
            } else {
                localStorage.removeItem("rockai_speaker_id");
            }
            setDeviceMessage("Speaker output updated.");
        } catch (error) {
            console.error("Unable to change speaker:", error);
            setDeviceMessage(error.message || "Could not change speaker output.");
        }
    };

    // Connect Gemini Live and start microphone
    const startVoice = async () => {
        if (connectingRef.current || sessionRef.current) return;

        try {
            connectingRef.current = true;

            setIsConnecting(true);
            setConnectionStatus("Connecting to Gemini...");

            // Reset previous conversation state
            transcriptRef.current = [];
            pendingMessageRef.current = null;
            conversationIdRef.current = null;
            saveQueueRef.current = Promise.resolve();

            setTranscript([]);

            // Initialize audio playback
            await audioPlayerRef.current.initialize();

            // Restore the saved output device where the browser supports it.
            if (
                selectedSpeakerId &&
                typeof audioPlayerRef.current.setOutputDevice === "function"
            ) {
                try {
                    await audioPlayerRef.current.setOutputDevice(selectedSpeakerId);
                } catch (deviceError) {
                    console.warn("Saved speaker could not be restored:", deviceError);
                }
            }

            // Connect Gemini Live
            const session = await connectGeminiLive({

                onOpen: () => {
                    setConnectionStatus("Gemini connected");
                },
                onToolCall: handleGeminiToolCall,



                // Receive user and assistant transcriptions
                onTranscript: ({ role, text }) => {
                    updateTranscript({ role, text });

                    if (role === "assistant" && text?.trim()) {
                        setIsAssistantSpeaking(true);

                        // Keep the speaking glow briefly after the latest transcript chunk.
                        clearTimeout(speakingTimerRef.current);
                        speakingTimerRef.current = setTimeout(() => {
                            setIsAssistantSpeaking(false);
                        }, 1000);
                    }
                },

                // Play Gemini audio
                onAudio: (audioData) => {
                    audioPlayerRef.current.playAudio(audioData).catch((error) => {
                        console.error("Audio playback error:", error);
                        setConnectionStatus("Audio playback error");
                    });
                },

                // Handle interruption
                onInterrupted: () => {
                    audioPlayerRef.current.stop();
                    clearTimeout(speakingTimerRef.current);
                    setIsAssistantSpeaking(false);
                },

                onError: (error) => {
                    console.error("Gemini Live error:", error);
                    setConnectionStatus("Connection error");
                },

                onClose: () => {
                    flushPendingMessage();

                    stopMicrophone();
                    audioPlayerRef.current.stop();

                    sessionRef.current = null;

                    setIsConnected(false);
                    setIsMuted(false);
                    setIsPaused(false);
                    clearTimeout(speakingTimerRef.current);
                    setIsAssistantSpeaking(false);
                    setConnectionStatus("Disconnected");
                }
            });

            sessionRef.current = session;

            // Create MongoDB conversation
            setConnectionStatus("Creating voice conversation...");

            const conversation = await createVoiceConversation();

            conversationIdRef.current = conversation._id;

            // Start microphone
            await startMicrophone(
                session,
                (error) => {
                    console.error("Microphone initialization failed:", error);
                    setConnectionStatus("Microphone access failed");
                },
                selectedMicrophoneId || undefined
            );

            // Permission is now granted, so browser device labels may be available.
            await refreshAudioDevices();

            setMicrophoneMuted(isMuted || isPaused);

            setIsConnected(true);
            setConnectionStatus("Listening...");

        } catch (error) {

            console.error("Unable to start voice:", error);

            flushPendingMessage();

            stopMicrophone();
            audioPlayerRef.current.stop();

            sessionRef.current?.close();
            sessionRef.current = null;

            conversationIdRef.current = null;

            setIsConnected(false);
            setConnectionStatus(error.message || "Connection failed");

        } finally {
            connectingRef.current = false;
            setIsConnecting(false);
        }
    };

    // Mute and unmute microphone
    const toggleMute = () => {
        const nextMuted = !isMuted;

        setIsMuted(nextMuted);
        setMicrophoneMuted(nextMuted || isPaused);
    };

    // Mute and unmute AI speaker
    const toggleSpeaker = () => {
        const nextMuted = !isSpeakerMuted;

        setIsSpeakerMuted(nextMuted);
        audioPlayerRef.current.setMuted(nextMuted);
    };

    // Pause and resume microphone
    const togglePause = () => {
        const nextPaused = !isPaused;

        setIsPaused(nextPaused);
        setMicrophoneMuted(nextPaused || isMuted);

        if (nextPaused) {
            setConnectionStatus("Paused");
        } else {
            setConnectionStatus("Listening...");
        }
    };

    // Disconnect Gemini Live
    const endVoice = async () => {

        // Save the last pending transcription
        flushPendingMessage();

        const session = sessionRef.current;

        sessionRef.current = null;
        connectingRef.current = false;

        stopMicrophone();
        audioPlayerRef.current.stop();

        if (session) {
            session.close();
        }

        // Wait until queued messages are saved
        await waitForVoiceSaves();

        conversationIdRef.current = null;

        setIsConnected(false);
        setIsMuted(false);
        setIsPaused(false);
        setIsConnecting(false);

        setConnectionStatus("Ready to connect");
    };
    // Load voice history
    const loadVoiceHistory = async () => {
        try {
            setIsHistoryLoading(true);
            setHistoryError("");

            const data = await getVoiceConversations();

            if (data.success) {
                setVoiceHistory(data.conversations || []);
            } else {
                setHistoryError(
                    data.message || "Unable to load voice history."
                );
            }

        } catch (error) {
            console.error("History loading error:", error);

            setHistoryError(
                error.message || "Failed to load voice history."
            );

        } finally {
            setIsHistoryLoading(false);
        }
    };

    // Open History view
    const openHistory = async () => {
        if (connectingRef.current || isConnecting) return;

        // End active voice session before opening history
        if (sessionRef.current || isConnected) {
            await endVoice();
        }

        setActiveView("history");
        setSelectedConversation(null);

        await loadVoiceHistory();
    };

    // Return to Voice view
    const openVoice = () => {
        setActiveView("voice");
        setSelectedConversation(null);
        setHistoryError("");
    };

    // Open a particular saved conversation
    const openConversation = async (conversationId) => {
        try {
            setHistoryError("");
            setIsHistoryLoading(true);

            const data = await getVoiceConversation(conversationId);

            if (data.success) {
                setSelectedConversation(data.conversation);
            } else {
                setHistoryError(
                    data.message || "Unable to open conversation."
                );
            }

        } catch (error) {
            console.error("Conversation loading error:", error);

            setHistoryError(
                error.message || "Failed to open conversation."
            );

        } finally {
            setIsHistoryLoading(false);
        }
    };

    // Delete a saved conversation
    const handleDeleteConversation = async (conversationId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this voice conversation?"
        );

        if (!confirmed) return;

        try {
            setDeletingId(conversationId);
            setHistoryError("");

            const data = await deleteVoiceConversation(conversationId);

            if (data.success) {

                setVoiceHistory((previous) =>
                    previous.filter(
                        (conversation) =>
                            conversation._id !== conversationId
                    )
                );

                if (selectedConversation?._id === conversationId) {
                    setSelectedConversation(null);
                }

            } else {
                setHistoryError(
                    data.message || "Unable to delete conversation."
                );
            }

        } catch (error) {
            console.error("Delete conversation error:", error);

            setHistoryError(
                error.message || "Failed to delete conversation."
            );

        } finally {
            setDeletingId(null);
        }
    };

    // Start a new voice conversation from History
    const handleNewVoice = () => {
        setSelectedConversation(null);
        setTranscript([]);
        transcriptRef.current = [];
        setActiveView("voice");
        setConnectionStatus("Ready to connect");
    };

    // Format conversation title
    const getConversationTitle = (conversation) => {
        return conversation.title || "New Voice Conversation";
    };

    // Get conversation preview
    const getConversationPreview = (conversation) => {
        if (!conversation.messages?.length) {
            return "No messages";
        }

        const lastMessage =
            conversation.messages[conversation.messages.length - 1];

        return lastMessage.text?.slice(0, 80) || "No preview available";
    };

    // Cleanup when leaving Voice Mode
    useEffect(() => {
        const audioPlayer = audioPlayerRef.current;

        return () => {
            flushPendingMessage();
            clearTimeout(speakingTimerRef.current);

            stopMicrophone();

            sessionRef.current?.close();
            sessionRef.current = null;

            audioPlayer.close();
        };

    }, []);
    const navigationItems = [
        {
            icon: "fa-microphone",
            label: "Voice",
            view: "voice"
        },
        {
            icon: "fa-message",
            label: "Chat",
            view: "chat"
        },
        {
            icon: "fa-clock",
            label: "History",
            view: "history"
        },
        // {
        //     icon: "fa-gear",
        //     label: "Settings",
        //     view: "settings"
        // }
    ];

    // Handle sidebar navigation
    const handleNavigation = async (view) => {
        setMobileMenu(false);

        if (view === "voice") {
            openVoice();
        }

        if (view === "history") {
            await openHistory();
        }

        if (view === "chat") {
            navigate("/");
        }

    };
    return (
        <main className="relative min-h-screen w-full overflow-x-hidden bg-[#08091d] text-white">

            {/* Background effects */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">

                <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-purple-700/30 blur-[110px] sm:h-96 sm:w-96" />

                <div className="absolute -right-40 top-40 h-80 w-80 rounded-full bg-cyan-500/25 blur-[110px] sm:h-96 sm:w-96" />

                <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-700/30 blur-[110px]" />

            </div>


            {/* Desktop sidebar */}
            <aside className="fixed left-0 top-0 z-30 hidden h-screen w-28 flex-col items-center border-r border-white/10 bg-black/20 py-7 backdrop-blur-xl md:flex">

                <div className="mb-20 flex h-16 w-16 items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/20 text-3xl text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.4)]">

                    <i className="fa-solid fa-wave-square" />

                </div>


                <nav className="flex flex-col gap-8 text-center text-gray-400">

                    {navigationItems.map((item) => (

                        <button
                            key={item.label}
                            onClick={() => handleNavigation(item.view)}
                            className={`flex flex-col items-center gap-2 rounded-2xl px-5 py-4 transition ${activeView === item.view
                                ? "border border-purple-400 bg-purple-600/30 text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.35)]"
                                : "hover:text-white"
                                }`}
                        >

                            <i className={`fa-solid ${item.icon} text-xl`} />

                            <span className="text-sm">
                                {item.label}
                            </span>

                        </button>

                    ))}

                </nav>

            </aside>


            {/* Main content */}
            <div className="relative z-10 min-h-screen md:ml-28">


                {/* Header */}
                <header className="flex items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">

                    <div className="flex items-center gap-3">

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenu(!mobileMenu)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-lg md:hidden"
                            aria-label="Toggle navigation menu"
                            aria-expanded={mobileMenu}
                        >

                            <i className={`fa-solid ${mobileMenu ? "fa-xmark" : "fa-bars"}`} />

                        </button>


                        <div>

                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">

                                Rock<span className="text-purple-400">AI</span>

                            </h1>

                            <p className="mt-1 text-[9px] tracking-[0.3em] text-gray-400 sm:text-xs sm:tracking-[0.4em]">

                                {activeView === "history"
                                    ? "VOICE HISTORY"
                                    : "VOICE MODE"}

                            </p>

                        </div>

                    </div>


                    {/* Header actions */}
                    <div className="flex items-center gap-2 sm:gap-3">

                        {activeView === "voice" && (

                            <button
                                aria-label="Voice settings"
                                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                                className={`flex h-10 w-10 items-center justify-center rounded-full border transition sm:h-11 sm:w-11 ${showVoiceSettings
                                    ? "border-purple-400 bg-purple-500/20 text-purple-300"
                                    : "border-white/20 bg-white/5 hover:bg-white/10"
                                    }`}
                            >
                                <i className="fa-solid fa-gear" />
                            </button>
                        )}


                        <button
                            onClick={async () => {
                                await endVoice();
                                navigate("/chat");
                            }} aria-label="Close voice mode"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-red-500/20 sm:h-11 sm:w-11"
                        >

                            <i className="fa-solid fa-xmark text-lg sm:text-xl" />

                        </button>

                    </div>

                </header>
                {/* Voice Settings Popup */}
                {showVoiceSettings && activeView === "voice" && (
                    <div className="absolute right-4 top-20 z-50 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-purple-400/30 bg-[#11132e]/95 p-5 shadow-2xl shadow-purple-900/30 backdrop-blur-xl sm:right-8">

                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Voice Settings
                                </h3>
                                <p className="mt-1 text-xs text-gray-400">
                                    Customize your voice experience
                                </p>
                            </div>

                            <button
                                onClick={() => setShowVoiceSettings(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/10 hover:text-white"
                                aria-label="Close settings"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        {/* Speaker */}
                        <div className="flex items-center justify-between border-b border-white/10 py-4">
                            <div>
                                <p className="text-sm font-medium">Speaker</p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Enable AI voice responses
                                </p>
                            </div>

                            <button
                                onClick={toggleSpeaker}
                                className={`relative h-6 w-11 rounded-full transition ${!isSpeakerMuted ? "bg-purple-500" : "bg-gray-600"
                                    }`}
                                aria-label="Toggle speaker"
                            >
                                <span
                                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${!isSpeakerMuted ? "left-6" : "left-1"
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Live Transcript */}
                        <div className="flex items-center justify-between border-b border-white/10 py-4">
                            <div>
                                <p className="text-sm font-medium">Live Transcript</p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Display conversation text
                                </p>
                            </div>

                            <button
                                onClick={() => setShowTranscript(!showTranscript)}
                                className={`relative h-6 w-11 rounded-full transition ${showTranscript ? "bg-purple-500" : "bg-gray-600"
                                    }`}
                                aria-label="Toggle transcript"
                            >
                                <span
                                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${showTranscript ? "left-6" : "left-1"
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Microphone device selection */}
                        <div className="border-b border-white/10 py-4">
                            <div className="mb-2 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Microphone input</p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        {isConnected
                                            ? isMuted
                                                ? "Microphone muted"
                                                : isPaused
                                                    ? "Microphone paused"
                                                    : "Microphone active"
                                            : "Choose the input for your next session"}
                                    </p>
                                </div>
                                <i className={`fa-solid ${isConnected && !isMuted && !isPaused
                                    ? "fa-microphone text-green-400"
                                    : "fa-microphone-slash text-gray-500"
                                    }`} />
                            </div>

                            <select
                                value={selectedMicrophoneId}
                                onChange={(event) => handleMicrophoneChange(event.target.value)}
                                disabled={isChangingMicrophone || audioInputDevices.length === 0}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-[#090b20] px-3 py-3 text-sm text-white outline-none transition focus:border-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <option value="">Default microphone</option>
                                {audioInputDevices.map((device, index) => (
                                    <option
                                        key={device.deviceId || `microphone-${index}`}
                                        value={device.deviceId}
                                    >
                                        {device.label || `Microphone ${index + 1}`}
                                    </option>
                                ))}
                            </select>
                            {isChangingMicrophone && (
                                <p className="mt-2 text-xs text-purple-300">
                                    Switching microphone...
                                </p>
                            )}
                        </div>

                        {/* Speaker output selection */}
                        <div className="border-b border-white/10 py-4">
                            <div className="mb-2">
                                <p className="text-sm font-medium">Speaker output</p>
                                <p className="mt-1 text-xs text-gray-400">
                                    {speakerSelectionSupported
                                        ? "Choose where RockAI audio plays"
                                        : "Output routing is managed by your device/browser"}
                                </p>
                            </div>

                            <select
                                value={selectedSpeakerId}
                                onChange={(event) => handleSpeakerChange(event.target.value)}
                                disabled={!speakerSelectionSupported || audioOutputDevices.length === 0}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-[#090b20] px-3 py-3 text-sm text-white outline-none transition focus:border-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Default speaker</option>
                                {audioOutputDevices.map((device, index) => (
                                    <option
                                        key={device.deviceId || `speaker-${index}`}
                                        value={device.deviceId}
                                    >
                                        {device.label || `Speaker ${index + 1}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {deviceMessage && (
                            <p className="mt-3 rounded-xl bg-purple-500/10 p-3 text-xs leading-relaxed text-purple-200">
                                {deviceMessage}
                            </p>
                        )}

                        <div className="mt-3 rounded-xl bg-purple-500/10 p-3">
                            <p className="text-xs leading-relaxed text-purple-200">
                                On mobile, speaker routing may be controlled by Android or iOS.
                                Microphone choices depend on devices exposed by your browser.
                            </p>
                        </div>

                    </div>
                )}


                {/* Mobile navigation dropdown */}
                {mobileMenu && (

                    <div className="absolute left-4 right-4 top-20 z-40 rounded-2xl border border-purple-400/30 bg-[#11132e]/95 p-3 shadow-2xl backdrop-blur-xl md:hidden">

                        {navigationItems.map((item) => (

                            <button
                                key={item.label}
                                onClick={() => handleNavigation(item.view)}
                                className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left ${activeView === item.view
                                    ? "bg-purple-500/20 text-purple-300"
                                    : "text-gray-300 hover:bg-white/5"
                                    }`}
                            >

                                <i className={`fa-solid ${item.icon} w-5`} />

                                <span>{item.label}</span>

                            </button>

                        ))}

                    </div>

                )}


                {/* ================================== */}
                {/* VOICE HISTORY VIEW */}
                {/* ================================== */}

                {activeView === "history" && (

                    <section className="mx-auto min-h-[calc(100vh-110px)] w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">

                        {/* History heading */}
                        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">

                            <div>

                                <h2 className="text-2xl font-bold sm:text-3xl">
                                    Your Conversations
                                </h2>

                                <p className="mt-2 text-sm text-gray-400">
                                    Access your previous RockAI voice conversations.
                                </p>

                            </div>


                            <button
                                onClick={handleNewVoice}
                                className="rounded-full bg-linear-to-r from-purple-600 to-indigo-500 px-5 py-3 text-sm font-semibold shadow-lg shadow-purple-500/20 transition hover:scale-105"
                            >

                                <i className="fa-solid fa-plus mr-2" />

                                New Voice

                            </button>

                        </div>


                        {/* Error message */}
                        {historyError && (

                            <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">

                                <i className="fa-solid fa-circle-exclamation mr-2" />

                                {historyError}

                            </div>

                        )}


                        {/* Loading */}
                        {isHistoryLoading && (

                            <div className="flex min-h-64 flex-col items-center justify-center">

                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-400/20 border-t-purple-400" />

                                <p className="mt-4 text-sm text-gray-400">
                                    Loading conversations...
                                </p>

                            </div>

                        )}


                        {/* Empty history */}
                        {!isHistoryLoading && voiceHistory.length === 0 && !historyError && (

                            <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/4 px-5 text-center backdrop-blur-xl">

                                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-purple-400/30 bg-purple-500/10 text-3xl text-purple-300">

                                    <i className="fa-solid fa-microphone" />

                                </div>


                                <h3 className="text-xl font-semibold">
                                    No conversations yet
                                </h3>

                                <p className="mt-2 max-w-sm text-sm text-gray-400">
                                    Your saved voice conversations will appear here.
                                </p>


                                <button
                                    onClick={handleNewVoice}
                                    className="mt-6 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold transition hover:bg-purple-500"
                                >

                                    Start Your First Conversation

                                </button>

                            </div>

                        )}


                        {/* History content */}
                        {!isHistoryLoading && voiceHistory.length > 0 && (

                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">


                                {/* Conversation list */}
                                <div className="space-y-3 lg:col-span-2">

                                    {voiceHistory.map((conversation) => (

                                        <div
                                            key={conversation._id}
                                            className={`flex items-center gap-3 rounded-2xl border p-4 transition ${selectedConversation?._id === conversation._id
                                                ? "border-purple-400 bg-purple-500/15"
                                                : "border-white/10 bg-white/4 hover:border-purple-400/40 hover:bg-white/[0.07]"
                                                }`}
                                        >

                                            {/* Open conversation */}
                                            <button
                                                onClick={() => openConversation(conversation._id)}
                                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                            >

                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/10 text-xl text-purple-300">

                                                    <i className="fa-solid fa-message" />

                                                </div>


                                                <div className="min-w-0 flex-1">

                                                    <h3 className="truncate text-sm font-semibold text-white">

                                                        {getConversationTitle(conversation)}

                                                    </h3>

                                                    <p className="mt-1 truncate text-xs text-gray-400">

                                                        {getConversationPreview(conversation)}

                                                    </p>

                                                </div>

                                            </button>


                                            {/* Delete button */}
                                            <button
                                                onClick={() => handleDeleteConversation(conversation._id)}
                                                disabled={deletingId === conversation._id}
                                                aria-label="Delete conversation"
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-40"
                                            >

                                                <i className={`fa-solid ${deletingId === conversation._id
                                                    ? "fa-spinner animate-spin"
                                                    : "fa-trash"
                                                    }`} />

                                            </button>

                                        </div>

                                    ))}

                                </div>


                                {/* Selected conversation */}
                                <div className="min-h-96 rounded-3xl border border-purple-400/20 bg-white/4 p-4 backdrop-blur-xl sm:p-6 lg:col-span-3">

                                    {selectedConversation ? (

                                        <>

                                            {/* Conversation heading */}
                                            <div className="mb-6 border-b border-white/10 pb-4">

                                                <h3 className="text-lg font-bold sm:text-xl">

                                                    {getConversationTitle(selectedConversation)}

                                                </h3>

                                                <p className="mt-2 text-xs text-gray-400">

                                                    {selectedConversation.messages?.length || 0} messages

                                                </p>

                                            </div>


                                            {/* Saved messages */}
                                            <div className="max-h-137.5 space-y-5 overflow-y-auto pr-2">

                                                {selectedConversation.messages?.length > 0 ? (

                                                    selectedConversation.messages.map((message, index) => {

                                                        const isUser = message.role === "user";

                                                        return (

                                                            <div
                                                                key={message._id || index}
                                                                className="flex min-w-0 gap-3"
                                                            >

                                                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isUser
                                                                    ? "bg-blue-500/30 text-cyan-300"
                                                                    : "bg-purple-500 text-white"
                                                                    }`}>

                                                                    <i className={`fa-solid ${isUser
                                                                        ? "fa-user"
                                                                        : "fa-wave-square"
                                                                        }`} />

                                                                </div>


                                                                <div className="min-w-0 flex-1">

                                                                    <p className="text-sm font-semibold">

                                                                        {isUser ? "You" : "RockAI"}

                                                                    </p>

                                                                    <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-gray-300">

                                                                        {message.text}

                                                                    </p>

                                                                </div>

                                                            </div>

                                                        );

                                                    })

                                                ) : (

                                                    <p className="py-10 text-center text-sm text-gray-400">
                                                        No messages available.
                                                    </p>

                                                )}

                                            </div>

                                        </>

                                    ) : (

                                        <div className="flex min-h-80 flex-col items-center justify-center text-center">

                                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10 text-2xl text-purple-300">

                                                <i className="fa-regular fa-comments" />

                                            </div>

                                            <h3 className="text-lg font-semibold">
                                                Select a conversation
                                            </h3>

                                            <p className="mt-2 max-w-xs text-sm text-gray-400">
                                                Choose a conversation from the list to view its transcript.
                                            </p>

                                        </div>

                                    )}

                                </div>

                            </div>

                        )}

                    </section>

                )}
                {/* ================================== */}
                {/* LIVE VOICE MODE VIEW */}
                {/* ================================== */}

                {activeView === "voice" && (

                    <>

                        {/* AI Character */}
                        <section className="flex flex-col items-center px-4 pt-4 text-center sm:pt-7 lg:pt-8">

                            <div className="relative flex aspect-square w-[min(65vw,250px)] items-center justify-center sm:w-[min(55vw,300px)] md:w-80 lg:w-80">

                                {/* Outer animated ring */}
                                <div className="absolute inset-0 animate-spin rounded-full border border-purple-400/50 [animation-duration:18s]" />

                                {/* Inner ring */}
                                <div className="absolute inset-[7%] rounded-full border border-cyan-400/40 shadow-[0_0_35px_rgba(34,211,238,0.25)]" />

                                {/* Aura */}
                                <div className="absolute inset-[15%] animate-pulse rounded-full bg-linear-to-br from-purple-500/30 via-blue-500/20 to-cyan-400/30 blur-2xl" />

                                {/* RockAI Avatar - fitted inside the existing animated circular frame */}
                                <div
                                    className={`absolute inset-[8%] z-10 overflow-hidden rounded-full border bg-[#08091d] transition-all duration-500 ${isAssistantSpeaking
                                        ? "scale-[1.025] border-cyan-300/80 shadow-[0_0_48px_rgba(34,211,238,0.55)]"
                                        : "border-purple-400/40 shadow-[0_0_35px_rgba(139,92,246,0.4)]"
                                        }`}
                                >
                                    <img
                                        src="/images/rockai-avatar.png"
                                        alt="RockAI robotic AI assistant"
                                        className="h-full w-full rounded-full object-cover object-top"
                                        draggable="false"
                                    />
                                </div>

                                {/* Floating particles */}
                                <span className="absolute left-[8%] top-[30%] h-2 w-2 animate-ping rounded-full bg-cyan-300" />

                                <span className="absolute right-[10%] top-[20%] h-2 w-2 animate-pulse rounded-full bg-purple-300" />

                                <span className="absolute bottom-[15%] right-[8%] h-3 w-3 animate-ping rounded-full bg-blue-300" />

                            </div>

                            {/* Live audio visualizer - reacts to real microphone or RockAI audio */}
                            <div
                                className="mt-5 flex h-10 items-center justify-center gap-0.75"
                                role="img"
                                aria-label={
                                    visualizerSource === "speaking"
                                        ? "RockAI is speaking"
                                        : visualizerSource === "listening"
                                            ? "Listening to your voice"
                                            : "Audio visualizer idle"
                                }
                            >
                                {Array.from({ length: 31 }, (_, index) => {
                                    const center = 15;
                                    const distance = Math.abs(index - center) / center;
                                    const shape = 0.28 + (1 - distance) * 0.72;
                                    const ripple = 0.72 + 0.28 * Math.sin(index * 1.7);
                                    const barLevel = visualizerLevel * shape * ripple;
                                    const height = 4 + barLevel * 34;

                                    return (
                                        <span
                                            key={index}
                                            className={`w-0.75 rounded-full transition-[height,opacity] duration-75 ${visualizerSource === "speaking"
                                                ? "bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                                                : visualizerSource === "listening"
                                                    ? "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.65)]"
                                                    : "bg-indigo-400/50"
                                                }`}
                                            style={{
                                                height: `${visualizerSource === "idle" ? 4 : height}px`,
                                                opacity: visualizerSource === "idle" ? 0.45 : 0.55 + barLevel * 0.45
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            <h2 className="mt-4 text-2xl font-bold sm:mt-5 sm:text-3xl md:text-4xl">

                                Hey, I'm <span className="text-purple-400">RockAI.</span>

                            </h2>


                            <p className="mt-2 max-w-md text-sm text-gray-300 sm:text-base md:text-lg">

                                I'm here. What would you like to talk about?

                            </p>

                        </section>


                        {/* Live Transcript */}
                        {showTranscript && (

                            <section className="mx-auto mt-7 w-[calc(100%-2rem)] max-w-4xl rounded-2xl border border-purple-400/40 bg-white/[0.07] p-4 shadow-[0_0_30px_rgba(139,92,246,0.12)] backdrop-blur-xl sm:mt-8 sm:w-[90%] sm:rounded-3xl sm:p-6 lg:p-7">

                                {/* Transcript Header */}
                                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">

                                    <h3 className="text-sm font-semibold sm:text-base">

                                        Live conversation

                                    </h3>


                                    <span className="flex items-center gap-2 text-xs text-gray-400">

                                        <span className={`h-2 w-2 rounded-full ${isConnected && !isPaused
                                            ? "animate-pulse bg-cyan-300"
                                            : "bg-gray-500"
                                            }`} />

                                        {isConnected ? "Live" : "Transcript"}

                                    </span>

                                </div>


                                {/* Scrollable Transcript Container */}
                                <div
                                    ref={transcriptContainerRef}
                                    className="max-h-64 space-y-4 overflow-y-auto pr-2 sm:max-h-80"
                                >

                                    {transcript.length === 0 ? (

                                        <p className="py-5 text-center text-sm leading-relaxed text-gray-400">

                                            {isConnected
                                                ? "Start speaking. Your conversation will appear here."
                                                : "Connect to RockAI Voice Mode to see your conversation here."}

                                        </p>

                                    ) : (

                                        transcript.map((message) => {

                                            const isUser = message.role === "user";

                                            return (

                                                <div
                                                    key={message.id}
                                                    className="flex min-w-0 gap-3 sm:gap-4"
                                                >

                                                    {/* User / AI Icon */}
                                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${isUser
                                                        ? "bg-blue-500/30 text-cyan-300"
                                                        : "bg-purple-500 text-white"
                                                        }`}>

                                                        <i className={`fa-solid ${isUser
                                                            ? "fa-user"
                                                            : "fa-wave-square"
                                                            }`} />

                                                    </div>


                                                    {/* Message Content */}
                                                    <div className="min-w-0 flex-1">

                                                        <p className="text-sm font-semibold">

                                                            {isUser ? "You" : "RockAI"}

                                                        </p>


                                                        <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-gray-300 sm:text-base">

                                                            {message.text}

                                                        </p>

                                                    </div>

                                                </div>

                                            );

                                        })

                                    )}

                                </div>

                            </section>

                        )}


                        {/* Connection Status */}
                        <div className="mt-6 flex justify-center px-4">

                            <div className="flex items-center gap-3 rounded-full border border-purple-400/50 bg-purple-500/20 px-5 py-3 text-xs shadow-[0_0_20px_rgba(168,85,247,0.2)] sm:text-sm">

                                <span className={`h-2 w-2 shrink-0 rounded-full ${isConnected && !isPaused
                                    ? "animate-pulse bg-cyan-300"
                                    : "bg-gray-400"
                                    }`} />


                                {isConnecting
                                    ? connectionStatus
                                    : isConnected
                                        ? isPaused
                                            ? "Paused"
                                            : connectionStatus
                                        : connectionStatus
                                }

                            </div>

                        </div>


                        {/* Voice Controls */}
                        <section className="mx-auto mt-7 flex w-full max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-5 px-3 pb-7 sm:mt-8 sm:gap-x-8 sm:gap-y-6 lg:gap-x-10">


                            {/* Speaker */}
                            <button
                                onClick={toggleSpeaker}
                                aria-label={isSpeakerMuted ? "Unmute speaker" : "Mute speaker"}
                                className="flex min-w-12 flex-col items-center gap-2 text-gray-300 hover:text-white"
                            >

                                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-lg transition hover:bg-white/10 sm:h-14 sm:w-14 sm:text-xl">

                                    <i className={`fa-solid ${isSpeakerMuted
                                        ? "fa-volume-xmark"
                                        : "fa-volume-high"
                                        }`} />

                                </span>


                                <span className="text-xs sm:text-sm">

                                    {isSpeakerMuted ? "Unmute" : "Speaker"}

                                </span>

                            </button>


                            {/* Microphone Mute */}
                            <button
                                onClick={toggleMute}
                                disabled={!isConnected}
                                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                                className="flex min-w-12 flex-col items-center gap-2 text-gray-300 hover:text-white disabled:opacity-40"
                            >

                                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-lg transition hover:bg-white/10 sm:h-14 sm:w-14 sm:text-xl">

                                    <i className={`fa-solid ${isMuted
                                        ? "fa-microphone-slash"
                                        : "fa-microphone"
                                        }`} />

                                </span>


                                <span className="text-xs sm:text-sm">

                                    {isMuted ? "Unmute" : "Mute"}

                                </span>

                            </button>


                            {/* Main Voice Button */}
                            <button
                                onClick={() => {
                                    if (!isConnected) {
                                        startVoice();
                                    } else {
                                        togglePause();
                                    }
                                }}
                                disabled={isConnecting}
                                aria-label={isConnected ? "Toggle voice pause" : "Start voice"}
                                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-purple-300 bg-linear-to-br from-purple-500 via-indigo-500 to-cyan-400 text-2xl shadow-[0_0_45px_rgba(139,92,246,0.8)] transition hover:scale-105 disabled:opacity-60 sm:h-24 sm:w-24 sm:text-3xl"
                            >

                                <i className={`fa-solid ${isConnected
                                    ? isPaused
                                        ? "fa-play"
                                        : "fa-wave-square"
                                    : "fa-microphone"
                                    }`} />

                            </button>


                            {/* Pause */}
                            <button
                                onClick={togglePause}
                                disabled={!isConnected}
                                aria-label={isPaused ? "Resume" : "Pause"}
                                className="flex min-w-12 flex-col items-center gap-2 text-gray-300 hover:text-white disabled:opacity-40"
                            >

                                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-lg transition hover:bg-white/10 sm:h-14 sm:w-14 sm:text-xl">

                                    <i className={`fa-solid ${isPaused ? "fa-play" : "fa-pause"
                                        }`} />

                                </span>


                                <span className="text-xs sm:text-sm">

                                    {isPaused ? "Resume" : "Pause"}

                                </span>

                            </button>


                            {/* End */}
                            <button
                                onClick={endVoice}
                                disabled={!isConnected && !isConnecting}
                                aria-label="End voice session"
                                className="flex min-w-12 flex-col items-center gap-2 text-gray-300 hover:text-white disabled:opacity-40"
                            >

                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-lg shadow-[0_0_25px_rgba(239,68,68,0.4)] transition hover:bg-red-600 sm:h-14 sm:w-14 sm:text-xl">

                                    <i className="fa-solid fa-phone-slash" />

                                </span>


                                <span className="text-xs sm:text-sm">

                                    End

                                </span>

                            </button>

                        </section>


                        {/* Footer */}
                        <footer className="pb-6 text-center text-xs text-gray-400 sm:text-sm">

                            Powered by <span className="font-semibold text-cyan-300">Gemini Live ✦</span>

                        </footer>

                    </>

                )}

            </div>

        </main>
    );
}

export default VoiceMode;