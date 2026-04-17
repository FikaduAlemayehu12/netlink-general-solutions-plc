import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

interface VideoCallProps {
  channelName: string;
  userId: string;
  partnerName: string;
  onEnd: () => void;
  isAudioOnly?: boolean;
}

export default function VideoCall({ channelName, userId, partnerName, onEnd, isAudioOnly = false }: VideoCallProps) {
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(isAudioOnly);
  const [elapsed, setElapsed] = useState(0);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const localVideoElRef = useRef<HTMLDivElement>(null);
  const remoteVideoElRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    joinCall();
    return () => { leaveCall(); };
  }, []);

  useEffect(() => {
    if (joined) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [joined]);

  const joinCall = async () => {
    try {
      // Agora channel names don't support hyphens — strip them
      const safeChannel = channelName.replace(/-/g, "");
      const { data, error } = await supabase.functions.invoke("agora-token", {
        body: { channelName: safeChannel },
      });
      if (error || !data?.appId) { alert("Could not start call"); onEnd(); return; }

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === "video" && remoteVideoElRef.current) {
          remoteUser.videoTrack?.play(remoteVideoElRef.current);
        }
        if (mediaType === "audio") {
          remoteUser.audioTrack?.play();
        }
      });

      client.on("user-unpublished", (remoteUser, mediaType) => {
        if (mediaType === "video" && remoteVideoElRef.current) {
          remoteVideoElRef.current.innerHTML = "";
        }
      });

      const uid = Math.floor(Math.random() * 100000);
      await client.join(data.appId, safeChannel, null, uid);

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localAudioRef.current = audioTrack;

      if (!isAudioOnly) {
        try {
          const videoTrack = await AgoraRTC.createCameraVideoTrack();
          localVideoRef.current = videoTrack;
          if (localVideoElRef.current) videoTrack.play(localVideoElRef.current);
          await client.publish([audioTrack, videoTrack]);
        } catch {
          // Camera not available, audio only
          await client.publish([audioTrack]);
          setVideoOff(true);
        }
      } else {
        await client.publish([audioTrack]);
      }

      setJoined(true);
    } catch (e) {
      console.error("Failed to join call:", e);
      alert("Failed to start call. Check camera/mic permissions.");
      onEnd();
    }
  };

  const leaveCall = async () => {
    localAudioRef.current?.close();
    localVideoRef.current?.close();
    await clientRef.current?.leave();
    clearInterval(timerRef.current);
    onEnd();
  };

  const toggleMute = () => {
    if (localAudioRef.current) {
      localAudioRef.current.setEnabled(muted);
      setMuted(!muted);
    }
  };

  const toggleVideo = async () => {
    if (videoOff && !localVideoRef.current) {
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoRef.current = videoTrack;
        if (localVideoElRef.current) videoTrack.play(localVideoElRef.current);
        await clientRef.current?.publish([videoTrack]);
        setVideoOff(false);
      } catch { /* camera unavailable */ }
    } else if (localVideoRef.current) {
      localVideoRef.current.setEnabled(videoOff);
      setVideoOff(!videoOff);
    }
  };

  const formatElapsed = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
    >
      <div className="text-center text-white mb-4">
        <h3 className="text-lg font-heading font-bold">{isAudioOnly ? "Voice Call" : "Video Call"}</h3>
        <p className="text-white/60 text-sm">{partnerName}</p>
        {joined && <p className="text-white/40 text-xs font-mono mt-1">{formatElapsed(elapsed)}</p>}
        {!joined && <p className="text-white/40 text-sm mt-2 animate-pulse">Connecting...</p>}
      </div>

      <div className="flex gap-4 mb-6">
        {/* Remote video */}
        <div ref={remoteVideoElRef} className="w-[400px] h-[300px] bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center">
          {!isAudioOnly && <p className="text-white/30 text-sm">Waiting for {partnerName}...</p>}
          {isAudioOnly && (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white text-2xl font-bold">
              {partnerName.charAt(0)}
            </div>
          )}
        </div>
        {/* Local video (small) */}
        {!isAudioOnly && (
          <div ref={localVideoElRef} className="w-[160px] h-[120px] bg-gray-700 rounded-xl overflow-hidden absolute bottom-32 right-8 border-2 border-white/20" />
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={toggleMute}
          variant="outline"
          size="lg"
          className={`rounded-full w-14 h-14 ${muted ? "bg-red-500/20 border-red-500 text-red-400" : "bg-white/10 border-white/20 text-white"}`}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        {!isAudioOnly && (
          <Button
            onClick={toggleVideo}
            variant="outline"
            size="lg"
            className={`rounded-full w-14 h-14 ${videoOff ? "bg-red-500/20 border-red-500 text-red-400" : "bg-white/10 border-white/20 text-white"}`}
          >
            {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>
        )}
        <Button
          onClick={leaveCall}
          size="lg"
          className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700 text-white"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}
