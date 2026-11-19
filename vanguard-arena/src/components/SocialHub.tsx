import React from 'react';
import {
  Ban,
  Check,
  Copy,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Swords,
  UserPlus,
  Users,
} from 'lucide-react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, stripUndefined } from '../lib/firebase.ts';
import { saveActiveSessionUser } from '../lib/serverlessApi.ts';
import type { GameType, Language, UserProfile } from '../types.ts';
import { soundEngine } from '../utils/sound.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface SocialHubProps {
  lang: Language;
  token: string;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  frames: any[];
  featureLocks: Record<string, boolean>;
  initialChatUserId?: string | null;
  onClearInitialChat?: () => void;
  onUserUpdated: (user: UserProfile) => void;
  onInspectPlayer: (userId: string) => void;
  onChallenge: (targetUserId: string, gameType: GameType) => void;
  onNotify: (level: string, message: string) => void;
}

export const SocialHub: React.FC<SocialHubProps> = ({
  lang,
  currentUser,
  allUsers,
  frames,
  initialChatUserId,
  onClearInitialChat,
  onUserUpdated,
  onInspectPlayer,
  onChallenge,
  onNotify,
}) => {
  const [subTab, setSubTab] = React.useState<'friends' | 'chat' | 'find' | 'blocked'>('friends');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeChatUserId, setActiveChatUserId] = React.useState<string | null>(initialChatUserId || null);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [chatInput, setChatInput] = React.useState('');
  const [copiedMyId, setCopiedMyId] = React.useState(false);

  React.useEffect(() => {
    if (initialChatUserId) {
      setActiveChatUserId(initialChatUserId);
      setSubTab('chat');
      onClearInitialChat?.();
    }
  }, [initialChatUserId, onClearInitialChat]);

  // Real-Time Firestore Direct Messages Subscription
  React.useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'messages'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        const m = d.data() as any;
        if (m.fromUserId === currentUser.id || m.toUserId === currentUser.id) {
          list.push({ ...m, id: d.id });
        }
      });
      list.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
      setMessages(list);
    });
    return () => unsub();
  }, [currentUser.id]);

  const friendIds: string[] = Array.isArray(currentUser.friends) ? currentUser.friends : [];
  const blockedIds: string[] = Array.isArray(currentUser.blocked) ? currentUser.blocked : [];

  const otherUsers = React.useMemo(
    () => allUsers.filter((u) => u.id !== currentUser.id),
    [allUsers, currentUser.id]
  );

  const friendProfiles = otherUsers.filter((u) => friendIds.includes(u.id) && !blockedIds.includes(u.id));
  const blockedProfiles = otherUsers.filter((u) => blockedIds.includes(u.id));

  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const visible = otherUsers.filter((u) => !blockedIds.includes(u.id));
    if (!q) return visible;
    return visible.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.gameId || '').toLowerCase().includes(q)
    );
  }, [otherUsers, blockedIds, searchQuery]);

  const updateSocialLists = async (nextFriends: string[], nextBlocked: string[], toast: string) => {
    const updated = { ...currentUser, friends: nextFriends, blocked: nextBlocked };
    saveActiveSessionUser(updated);
    onUserUpdated(updated);
    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'users', currentUser.id),
        stripUndefined({ friends: nextFriends, blocked: nextBlocked }),
        { merge: true }
      ).catch(() => {});
    }
    soundEngine.playClick();
    onNotify('success', toast);
  };

  const handleCopyMyId = () => {
    navigator.clipboard?.writeText(currentUser.gameId || currentUser.id);
    soundEngine.playClick();
    setCopiedMyId(true);
    onNotify('success', `Copied your Game ID: ${currentUser.gameId}`);
    setTimeout(() => setCopiedMyId(false), 1800);
  };

  const handleSendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatUserId || !chatInput.trim()) return;
    if (blockedIds.includes(activeChatUserId)) {
      onNotify('error', 'Block လုပ်ထားသော User ထံ စာပို့၍ မရပါ။');
      return;
    }
    const target = allUsers.find((u) => u.id === activeChatUserId);
    const id = `dm_${Date.now()}_${Math.floor(Math.random() * 999)}`;
    const msg = stripUndefined({
      id,
      fromUserId: currentUser.id,
      fromName: currentUser.displayName,
      toUserId: activeChatUserId,
      toName: target?.displayName || 'Player',
      text: chatInput.trim(),
      createdAtMs: Date.now(),
    });
    setMessages((prev) => [...prev, msg]);
    setChatInput('');
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'messages', id), msg).catch(() => {});
    }
    soundEngine.playClick();
  };

  const activeChatPartner = allUsers.find((u) => u.id === activeChatUserId);
  const activeThread = messages.filter(
    (m) =>
      (m.fromUserId === currentUser.id && m.toUserId === activeChatUserId) ||
      (m.fromUserId === activeChatUserId && m.toUserId === currentUser.id)
  );

  // Build unique conversation partner IDs
  const chatPartnerIds = Array.from(
    new Set([
      ...friendIds.filter((id) => !blockedIds.includes(id)),
      ...messages
        .map((m) => (m.fromUserId === currentUser.id ? m.toUserId : m.fromUserId))
        .filter((id) => id && id !== currentUser.id && !blockedIds.includes(id)),
    ])
  );

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3.5">
      {/* Top Banner with My Copyable Game ID */}
      <div className="cyber-panel rounded-2xl p-3.5 border border-amber-500/25 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>{lang === 'my' ? 'မိတ်ဆွေများနှင့် စာတိုပေးပို့ခြင်း (Social Hub)' : 'Social Hub & Direct Chat'}</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            {lang === 'my' ? 'Game ID ဖြင့် ရှာဖွေပြီး Add, Block, စာတိုပို့နိုင်ပါသည်' : 'Search by Game ID to Add, Message, or Block players'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyMyId}
          className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-xs font-mono font-bold text-amber-300 flex items-center gap-2 cursor-pointer"
        >
          <span>My ID: {currentUser.gameId}</span>
          {copiedMyId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl cyber-panel text-xs font-bold">
        {[
          { id: 'friends', label: `${lang === 'my' ? 'မိတ်ဆွေ' : 'Friends'} (${friendProfiles.length})` },
          { id: 'chat', label: `${lang === 'my' ? 'စာတို' : 'Chat'} (${chatPartnerIds.length})` },
          { id: 'find', label: lang === 'my' ? 'ရှာဖွေရန်' : 'Find Players' },
          { id: 'blocked', label: `Blocked (${blockedProfiles.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id as any)}
            className={`py-2 rounded-xl transition-all cursor-pointer truncate ${
              subTab === t.id ? 'cyber-gold-active text-amber-200' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: FRIENDS LIST */}
      {subTab === 'friends' && (
        <div className="cyber-panel rounded-2xl p-3.5 space-y-2.5">
          {friendProfiles.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="text-xs text-slate-400">
                {lang === 'my' ? 'မိတ်ဆွေ ထည့်သွင်းထားခြင်း မရှိသေးပါ။' : 'No friends added yet.'}
              </div>
              <button
                type="button"
                onClick={() => setSubTab('find')}
                className="px-4 py-2 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs cursor-pointer"
              >
                {lang === 'my' ? 'ကစားသမား ရှာဖွေမည်' : 'Find Players'}
              </button>
            </div>
          ) : (
            friendProfiles.map((u) => (
              <div
                key={u.id}
                className="p-2.5 rounded-xl bg-[#070b14] border border-white/10 flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => onInspectPlayer(u.id)}
                  className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                >
                  <AvatarWithFrame avatarUrl={u.avatarUrl} frameId={u.frameId} frames={frames} displayName={u.displayName} size="sm" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white truncate">{u.displayName}</div>
                    <div className="text-[11px] font-mono text-amber-400">{u.gameId} · {u.xp} XP</div>
                  </div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChatUserId(u.id);
                      setSubTab('chat');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => onChallenge(u.id, 'connect4')}
                    className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 cursor-pointer"
                    title="Challenge"
                  >
                    <Swords className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: REAL-TIME DIRECT MESSAGING */}
      {subTab === 'chat' && (
        <div className="grid md:grid-cols-12 gap-3 h-[56dvh] min-h-[340px]">
          {/* Partner List */}
          <div className="md:col-span-4 cyber-panel rounded-2xl p-2.5 overflow-y-auto space-y-1.5">
            {chatPartnerIds.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">
                {lang === 'my' ? 'စာပို့ရန် ကစားသမား တစ်ဦး ရွေးပါ။' : 'Add or find a player to start chatting.'}
              </div>
            ) : (
              chatPartnerIds.map((pid) => {
                const partner = allUsers.find((u) => u.id === pid);
                if (!partner) return null;
                const selected = activeChatUserId === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setActiveChatUserId(pid)}
                    className={`w-full p-2 rounded-xl flex items-center gap-2 text-left cursor-pointer ${
                      selected ? 'cyber-gold-active' : 'bg-[#070b14] hover:bg-white/5 border border-white/5'
                    }`}
                  >
                    <AvatarWithFrame avatarUrl={partner.avatarUrl} frameId={partner.frameId} frames={frames} displayName={partner.displayName} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{partner.displayName}</div>
                      <div className="text-[10px] font-mono text-amber-300">{partner.gameId}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Chat Thread */}
          <div className="md:col-span-8 cyber-panel rounded-2xl p-3 flex flex-col justify-between gap-2 overflow-hidden">
            {activeChatPartner ? (
              <>
                <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onInspectPlayer(activeChatPartner.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <AvatarWithFrame
                      avatarUrl={activeChatPartner.avatarUrl}
                      frameId={activeChatPartner.frameId}
                      frames={frames}
                      displayName={activeChatPartner.displayName}
                      size="xs"
                    />
                    <span className="text-xs font-bold text-white">{activeChatPartner.displayName}</span>
                    <span className="text-[10px] font-mono text-amber-400">({activeChatPartner.gameId})</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {activeThread.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-10">
                      {lang === 'my' ? 'စကားစတင်ပြောဆိုနိုင်ပါပြီ...' : 'Say hello to start chatting...'}
                    </div>
                  ) : (
                    activeThread.map((m) => {
                      const mine = m.fromUserId === currentUser.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[78%] px-3 py-2 rounded-2xl text-xs ${
                              mine
                                ? 'bg-amber-500 text-slate-950 font-semibold rounded-br-sm'
                                : 'bg-[#121a2d] text-slate-100 border border-white/10 rounded-bl-sm'
                            }`}
                          >
                            <div>{m.text}</div>
                            <div className={`text-[9px] mt-0.5 ${mine ? 'text-slate-900/70' : 'text-slate-400'}`}>
                              {new Date(m.createdAtMs || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendDm} className="flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={lang === 'my' ? 'စာတို ရိုက်ထည့်ပါ...' : 'Type a message...'}
                    className="flex-1 h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-4 h-10 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                {lang === 'my' ? 'ဘယ်ဘက်မှ ကစားသမားတစ်ဦးကို ရွေးချယ်ပြီး စာပို့ပါ။' : 'Select a player to open chat.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FIND PLAYERS BY NAME OR GAME ID */}
      {subTab === 'find' && (
        <div className="cyber-panel rounded-2xl p-3.5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'my' ? 'Game ID (ဥပမာ MR-123456) သို့မဟုတ် အမည်ဖြင့် ရှာပါ...' : 'Search by Game ID or Username...'}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {searchResults.map((u) => {
              const isFriend = friendIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  className="p-2.5 rounded-xl bg-[#070b14] border border-white/10 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => onInspectPlayer(u.id)}
                    className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                  >
                    <AvatarWithFrame avatarUrl={u.avatarUrl} frameId={u.frameId} frames={frames} displayName={u.displayName} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{u.displayName}</div>
                      <div className="text-[11px] font-mono text-amber-400">{u.gameId} · {u.xp} XP</div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isFriend && (
                      <button
                        type="button"
                        onClick={() =>
                          updateSocialLists(
                            Array.from(new Set([...friendIds, u.id])),
                            blockedIds,
                            `${u.displayName} ကို မိတ်ဆွေထည့်ပြီးပါပြီ!`
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Add
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveChatUserId(u.id);
                        setSubTab('chat');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-[11px] cursor-pointer"
                    >
                      DM
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSocialLists(
                          friendIds.filter((id) => id !== u.id),
                          Array.from(new Set([...blockedIds, u.id])),
                          `${u.displayName} ကို Block လုပ်ပြီးပါပြီ။`
                        )
                      }
                      className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 cursor-pointer"
                      title="Block User"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: BLOCKED USERS LIST */}
      {subTab === 'blocked' && (
        <div className="cyber-panel rounded-2xl p-3.5 space-y-2">
          {blockedProfiles.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-8">
              {lang === 'my' ? 'Block လုပ်ထားသော User မရှိပါ။' : 'No blocked users.'}
            </div>
          ) : (
            blockedProfiles.map((u) => (
              <div
                key={u.id}
                className="p-2.5 rounded-xl bg-[#070b14] border border-rose-500/25 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AvatarWithFrame avatarUrl={u.avatarUrl} frameId={u.frameId} frames={frames} displayName={u.displayName} size="sm" />
                  <div>
                    <div className="text-xs font-bold text-white">{u.displayName}</div>
                    <div className="text-[11px] font-mono text-slate-400">{u.gameId}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateSocialLists(
                      friendIds,
                      blockedIds.filter((id) => id !== u.id),
                      `${u.displayName} ကို Block ဖြုတ်ပြီးပါပြီ။`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Unblock
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
