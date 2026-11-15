import React from 'react';
import {
  Check,
  Copy,
  Crown,
  DoorOpen,
  MessageSquare,
  Play,
  Send,
  UserMinus,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type {
  CustomRoom,
  CustomRoomChatMessage,
  FeatureLocks,
  Language,
  ProfileFrame,
  UserProfile,
} from '../types.ts';
import { getRankInfo } from '../utils/rank.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface SakarRoomLobbyProps {
  lang: Language;
  room: CustomRoom;
  currentUser: UserProfile;
  frames: ProfileFrame[];
  featureLocks: FeatureLocks;
  chatMessages: CustomRoomChatMessage[];
  onLeaveRoom: () => void;
  onStartMatch: () => void;
  onKickPlayer: (userId: string) => void;
  onSendChat: (roomId: string, content: string) => void;
}

export const SakarRoomLobby: React.FC<SakarRoomLobbyProps> = ({
  lang,
  room,
  currentUser,
  frames,
  featureLocks,
  chatMessages,
  onLeaveRoom,
  onStartMatch,
  onKickPlayer,
  onSendChat,
}) => {
  const t = TRANSLATIONS[lang];
  const [copied, setCopied] = React.useState(false);
  const [chatText, setChatText] = React.useState('');
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);

  const isHost = room.hostId === currentUser.id;
  const canStart = isHost && room.participants.length >= 2 && room.status === 'waiting';

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked fallback ignored
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || featureLocks.chat) return;
    onSendChat(room.id, chatText.trim());
    setChatText('');
  };

  const slots = Array.from({ length: room.maxPlayers }, (_, idx) => room.participants[idx] || null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Room Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#17122B] via-[#13192B] to-[#121826] border border-amber-400/35 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-xs font-semibold text-amber-300">
              စကားထာ · Custom Room
            </span>
            <span className="text-xs font-mono text-slate-300 tabular-nums">
              {room.participants.length} / {room.maxPlayers} Players
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">{room.title}</h1>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-xs text-slate-400">{t.sakar.roomCodeLabel}:</span>
            <span className="px-3 py-1 rounded-lg bg-[#0A0D14] border border-amber-400/40 font-mono text-sm font-bold text-amber-300 tracking-wider">
              {room.code}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[36px] px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.sakar.copiedRoomId : t.sakar.copyRoomId}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onLeaveRoom}
            className="min-h-[44px] px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-xs sm:text-sm font-semibold text-rose-200 inline-flex items-center gap-2 cursor-pointer"
          >
            <DoorOpen className="w-4 h-4" />
            <span>{t.sakar.leaveRoomBtn}</span>
          </button>

          {isHost && (
            <button
              type="button"
              disabled={!canStart}
              onClick={onStartMatch}
              className="min-h-[44px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-slate-950 font-semibold text-sm inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Play className="w-4 h-4" />
              <span>{t.sakar.startMatchBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Seated Players Grid + Pre-Game Chat */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Seated Players Grid (2–8 slots) */}
        <section className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>
                Courtyard Seats ({room.participants.length}/{room.maxPlayers})
              </span>
            </h2>
            {!isHost && (
              <span className="text-xs text-slate-400">
                Waiting for Room Leader to start...
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {slots.map((participant, idx) => {
              if (!participant) {
                return (
                  <div
                    key={`empty_${idx}`}
                    className="min-h-[78px] p-3.5 rounded-xl border border-dashed border-white/10 bg-[#0A0D14]/60 flex items-center justify-between text-xs text-slate-500"
                  >
                    <span>Seat #{idx + 1}</span>
                    <span>{t.sakar.waitingSeat}</span>
                  </div>
                );
              }

              const rank = getRankInfo(participant.xp);
              const isSeatHost = participant.id === room.hostId;
              const isMe = participant.id === currentUser.id;

              return (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`min-h-[78px] p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isMe
                      ? 'bg-amber-500/10 border-amber-400/50'
                      : 'bg-[#0A0D14] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarWithFrame
                      avatarUrl={participant.avatarUrl}
                      frameId={participant.frameId}
                      frames={frames}
                      displayName={participant.displayName}
                      size="md"
                      status="online"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white flex items-center gap-1.5 truncate">
                        <span className="truncate">{participant.displayName}</span>
                        {isMe && <span className="text-xs text-amber-300">{t.match.you}</span>}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className={rank.colorClass}>{rank.tier}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-500">{participant.gameId}</span>
                      </div>
                      {isSeatHost && (
                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[10px] font-semibold text-amber-300">
                          <Crown className="w-3 h-3" />
                          <span>{t.sakar.hostBadge}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isHost && !isSeatHost && (
                    <button
                      type="button"
                      onClick={() => onKickPlayer(participant.id)}
                      className="min-h-[36px] px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>{t.sakar.kickPlayerBtn}</span>
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Pre-Game Room Chat */}
        <section className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-[#121826] border border-white/10 flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>{t.sakar.preGameChatTitle}</span>
            </h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">{chatMessages.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-4">
                {t.match.noMessagesYet}
              </div>
            ) : (
              chatMessages.map((msg) => {
                const mine = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    <span className="text-[11px] text-slate-500 mb-0.5">{msg.senderName}</span>
                    <div
                      className={`px-3 py-2 rounded-xl text-xs max-w-[85%] break-words ${
                        mine
                          ? 'bg-amber-500/20 border border-amber-400/30 text-amber-100'
                          : 'bg-[#0A0D14] border border-white/10 text-slate-200'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {featureLocks.chat ? (
            <div className="pt-3 border-t border-white/10 text-xs text-amber-300 text-center">
              {t.match.chatLocked}
            </div>
          ) : (
            <form onSubmit={handleSend} className="pt-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                maxLength={240}
                placeholder={t.sakar.preGameChatPlaceholder}
                className="flex-1 h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                aria-label="Send room message"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};
