import React from 'react';
import { Check, Copy, Crown, LogOut, Play, Send, UserX, Users } from 'lucide-react';
import type { Language, UserProfile } from '../types.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface SakarRoomLobbyProps {
  lang: Language;
  room: any;
  currentUser: UserProfile;
  frames: any[];
  featureLocks: Record<string, boolean>;
  chatMessages: any[];
  onLeaveRoom: () => void;
  onStartMatch: () => void;
  onKickPlayer: (targetUserId: string) => void;
  onSendChat: (text: string) => void;
}

export const SakarRoomLobby: React.FC<SakarRoomLobbyProps> = ({
  lang,
  room,
  currentUser,
  frames,
  chatMessages,
  onLeaveRoom,
  onStartMatch,
  onKickPlayer,
  onSendChat,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [chatText, setChatText] = React.useState('');

  const isHost = room.hostId === currentUser.id;
  const players: any[] = room.players || [currentUser];

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(room.code || room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText.trim());
    setChatText('');
  };

  return (
    <div className="h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-5rem)] max-w-3xl mx-auto px-3 py-2.5 flex flex-col justify-between gap-2.5 overflow-hidden">
      {/* Room Code Header */}
      <div className="p-3 rounded-2xl bg-[#121826] border border-amber-500/30 flex items-center justify-between gap-2 shrink-0">
        <div>
          <div className="text-[11px] text-amber-400 font-semibold uppercase">
            {room.gameType === 'sakarhtar' ? 'စကားထာ Room (1-8 Players)' : 'Custom 1v1 Room'}
          </div>
          <div className="text-lg font-mono font-bold text-white tracking-wider">{room.code}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
          <button
            type="button"
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 cursor-pointer"
            title="Leave Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Players List (Up to 8) */}
      <div className="rounded-2xl bg-[#121826] border border-white/10 p-3 space-y-2 shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-semibold text-white">
            <Users className="w-4 h-4 text-amber-400" />
            {lang === 'my' ? 'ပါဝင်သူများ' : 'Players'} ({players.length} / {room.maxPlayers || 8})
          </span>
          <span>{lang === 'my' ? 'Code ပေးပြီး ဖိတ်ခေါ်ပါ' : 'Share code to invite'}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
          {players.map((p) => (
            <div
              key={p.id}
              className="p-2 rounded-xl bg-[#0A0D14] border border-white/10 flex items-center justify-between gap-1.5"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <AvatarWithFrame
                  avatarUrl={p.avatarUrl}
                  frameId={p.frameId}
                  frames={frames}
                  displayName={p.displayName}
                  size="sm"
                />
                <span className="text-xs font-semibold text-white truncate">{p.displayName}</span>
              </div>
              {p.id === room.hostId ? (
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                isHost && (
                  <button
                    type="button"
                    onClick={() => onKickPlayer(p.id)}
                    className="text-rose-400 hover:text-rose-300 cursor-pointer shrink-0"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Room Chat */}
      <div className="flex-1 min-h-0 rounded-2xl bg-[#121826] border border-white/10 p-3 flex flex-col justify-between gap-2">
        <div className="flex-1 overflow-y-auto space-y-1 text-xs">
          {chatMessages.length === 0 ? (
            <div className="text-slate-500 text-center py-4">
              {lang === 'my' ? 'အခန်းတွင်း စကားပြောနိုင်ပါပြီ...' : 'Room chat ready...'}
            </div>
          ) : (
            chatMessages.map((m, idx) => (
              <div key={m.id || idx}>
                <span className="font-bold text-amber-400">{m.sender}: </span>
                <span className="text-slate-200">{m.text}</span>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleChat} className="flex gap-1.5 shrink-0">
          <input
            type="text"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder={lang === 'my' ? 'စာပို့မည်...' : 'Message room...'}
            className="flex-1 h-9 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
          />
          <button type="submit" className="px-3 h-9 rounded-xl bg-white/10 text-white cursor-pointer">
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Host Start Match Button */}
      {isHost ? (
        <button
          type="button"
          onClick={onStartMatch}
          className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{lang === 'my' ? 'ပွဲစတင်မည် (Start Match)' : 'Start Match Now'}</span>
        </button>
      ) : (
        <div className="h-11 rounded-xl bg-[#121826] border border-white/10 flex items-center justify-center text-xs text-amber-300 font-semibold shrink-0">
          {lang === 'my' ? 'အခန်းရှင် (Host) ပွဲစတင်မည်ကို စောင့်ဆိုင်းနေပါသည်...' : 'Waiting for Host to start match...'}
        </div>
      )}
    </div>
  );
};
