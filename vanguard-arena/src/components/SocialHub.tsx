import React from 'react';
import { Ban, Check, MessageSquare, Search, Send, ShieldOff, Swords, UserPlus, Wifi, X } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type {
  DirectMessage,
  FeatureLocks,
  FriendshipItem,
  GameType,
  Language,
  ProfileFrame,
  UserProfile,
} from '../types.ts';
import { getRankInfo } from '../utils/rank.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface SocialHubProps {
  lang: Language;
  token: string;
  currentUser: UserProfile;
  frames: ProfileFrame[];
  featureLocks: FeatureLocks;
  refreshTick: number;
  incomingDMs: DirectMessage[];
  onInspectPlayer: (userId: string) => void;
  onChallenge: (userId: string, gameType: GameType) => void;
  onNotify: (level: 'info' | 'error' | 'success', msg: string) => void;
}

export const SocialHub: React.FC<SocialHubProps> = ({
  lang,
  token,
  currentUser,
  frames,
  featureLocks,
  refreshTick,
  incomingDMs,
  onInspectPlayer,
  onChallenge,
  onNotify,
}) => {
  const t = TRANSLATIONS[lang];
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<UserProfile[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [friendships, setFriendships] = React.useState<FriendshipItem[]>([]);
  const [selectedFriend, setSelectedFriend] = React.useState<UserProfile | null>(null);
  const [messages, setMessages] = React.useState<DirectMessage[]>([]);
  const [dmInput, setDmInput] = React.useState('');

  const loadFriends = React.useCallback(async () => {
    try {
      const res = await fetch('/api/social/friends', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFriendships(data.friendships || []);
      }
    } catch {
      // silent
    }
  }, [token]);

  React.useEffect(() => {
    loadFriends();
  }, [loadFriends, refreshTick]);

  const loadConversation = React.useCallback(
    async (friendId: string) => {
      try {
        const res = await fetch(`/api/social/messages/${friendId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          loadFriends();
        }
      } catch {
        // silent
      }
    },
    [token, loadFriends]
  );

  React.useEffect(() => {
    if (selectedFriend) {
      loadConversation(selectedFriend.id);
    }
  }, [selectedFriend, loadConversation]);

  React.useEffect(() => {
    if (!selectedFriend || incomingDMs.length === 0) return;
    const latest = incomingDMs[incomingDMs.length - 1];
    if (latest.senderId === selectedFriend.id || latest.receiverId === selectedFriend.id) {
      setMessages((prev) => (prev.some((m) => m.id === latest.id) ? prev : [...prev, latest]));
    }
  }, [incomingDMs, selectedFriend]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSearchResults(data.users || []);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (targetUserId: string) => {
    const res = await fetch('/api/social/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUserId }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify('error', data.error || 'Could not send request.');
    } else {
      onNotify('success', 'Friend request sent.');
      loadFriends();
    }
  };

  const handleSocialAction = async (targetUserId: string, action: 'accept' | 'decline' | 'remove' | 'block' | 'unblock') => {
    await fetch('/api/social/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUserId, action }),
    });
    if (selectedFriend?.id === targetUserId && (action === 'block' || action === 'remove')) {
      setSelectedFriend(null);
    }
    loadFriends();
  };

  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend || !dmInput.trim()) return;
    const res = await fetch(`/api/social/messages/${selectedFriend.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: dmInput.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify('error', data.error || 'Unable to send message.');
    } else {
      setDmInput('');
      setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
    }
  };

  const accepted = friendships.filter((f) => f.status === 'accepted');
  const incomingReqs = friendships.filter((f) => f.status === 'pending_incoming');
  const blocked = friendships.filter((f) => f.status === 'blocked');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">{t.social.title}</h1>
        <p className="text-sm text-slate-400 mt-1">{t.social.subtitle}</p>
      </div>

      {/* Player Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2.5 max-w-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.social.searchPlaceholder}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#121826] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer whitespace-nowrap"
        >
          {searching ? t.social.searching : t.social.searchBtn}
        </button>
      </form>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#121826] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">{t.social.results}</span>
            <button
              type="button"
              onClick={() => setSearchResults([])}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              {t.social.clear}
            </button>
          </div>
          <div className="divide-y divide-white/10">
            {searchResults.map((u) => {
              const rank = getRankInfo(u.xp);
              return (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onInspectPlayer(u.id)}
                    className="flex items-center gap-3 text-left cursor-pointer"
                  >
                    <AvatarWithFrame avatarUrl={u.avatarUrl} frameId={u.frameId} frames={frames} displayName={u.displayName} size="sm" />
                    <div>
                      <div className="text-sm font-semibold text-white">{u.displayName}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {u.gameId} · <span className={rank.colorClass}>{rank.tier}</span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddFriend(u.id)}
                    className="min-h-[40px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{t.social.addFriend}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Friends & Requests Column */}
        <div className="lg:col-span-5 space-y-5">
          {incomingReqs.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#121826] border border-amber-400/30 space-y-3">
              <h2 className="text-sm font-display font-bold text-amber-300">
                {t.social.pendingRequests} ({incomingReqs.length})
              </h2>
              <div className="divide-y divide-white/10">
                {incomingReqs.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarWithFrame
                        avatarUrl={item.user.avatarUrl}
                        frameId={item.user.frameId}
                        frames={frames}
                        displayName={item.user.displayName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{item.user.displayName}</div>
                        <div className="text-xs text-slate-400 font-mono">{item.user.gameId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSocialAction(item.user.id, 'accept')}
                        aria-label="Accept friend request"
                        className="min-h-[40px] min-w-[40px] rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 flex items-center justify-center cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSocialAction(item.user.id, 'decline')}
                        aria-label="Decline friend request"
                        className="min-h-[40px] min-w-[40px] rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 rounded-2xl bg-[#121826] border border-white/10 space-y-3">
            <h2 className="text-base font-display font-bold text-white">
              {t.social.friendsTitle} ({accepted.length})
            </h2>
            {accepted.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">{t.social.noFriends}</p>
            ) : (
              <div className="divide-y divide-white/10">
                {accepted.map((item) => {
                  const isSel = selectedFriend?.id === item.user.id;
                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFriend(item.user as UserProfile)}
                        className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
                      >
                        <AvatarWithFrame
                          avatarUrl={item.user.avatarUrl}
                          frameId={item.user.frameId}
                          frames={frames}
                          displayName={item.user.displayName}
                          size="md"
                          status={item.playerStatus}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate flex items-center gap-2">
                            <span>{item.user.displayName}</span>
                            {Number(item.unreadCount) > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold tabular-nums">
                                {item.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5">
                            <span>{item.isOnline ? (item.playerStatus === 'in_game' ? 'In Match' : 'Online') : 'Offline'}</span>
                            {item.isOnline && item.pingMs ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums inline-flex items-center gap-0.5">
                                  <Wifi className="w-3 h-3 text-emerald-400" />
                                  {item.pingMs}ms
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedFriend(item.user as UserProfile)}
                          aria-label="Open Direct Message"
                          className={`min-h-[40px] min-w-[40px] rounded-xl border flex items-center justify-center cursor-pointer ${
                            isSel
                              ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        {item.isOnline && item.playerStatus !== 'in_game' && (
                          <button
                            type="button"
                            onClick={() => onChallenge(item.user.id, 'connect4')}
                            aria-label="Challenge Friend"
                            className="min-h-[40px] min-w-[40px] rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 flex items-center justify-center cursor-pointer"
                          >
                            <Swords className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSocialAction(item.user.id, 'block')}
                          aria-label="Block User"
                          className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-slate-400 hover:text-rose-300 flex items-center justify-center cursor-pointer"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {blocked.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#121826] border border-white/10 space-y-2">
              <h3 className="text-xs font-semibold text-slate-400">{t.social.blockedPlayers}</h3>
              {blocked.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300">{b.user.displayName}</span>
                  <button
                    type="button"
                    onClick={() => handleSocialAction(b.user.id, 'unblock')}
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    <span>{t.social.unblock}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Direct Message Conversation Panel */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#121826] border border-white/10 flex flex-col h-[520px]">
          {selectedFriend ? (
            <>
              <div className="pb-3.5 border-b border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onInspectPlayer(selectedFriend.id)}
                  className="flex items-center gap-3 text-left cursor-pointer"
                >
                  <AvatarWithFrame
                    avatarUrl={selectedFriend.avatarUrl}
                    frameId={selectedFriend.frameId}
                    frames={frames}
                    displayName={selectedFriend.displayName}
                    size="sm"
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">{selectedFriend.displayName}</div>
                    <div className="text-xs text-slate-400 font-mono">{selectedFriend.gameId}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onInspectPlayer(selectedFriend.id)}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  {t.social.viewProfile}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center mt-16">
                    {t.social.startChat} {selectedFriend.displayName}.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === currentUser.id;
                    return (
                      <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-sm max-w-[80%] break-words ${
                            mine
                              ? 'bg-amber-500/20 border border-amber-400/30 text-amber-50'
                              : 'bg-[#0A0D14] border border-white/10 text-slate-200'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {featureLocks.chat ? (
                <div className="pt-3 text-xs text-amber-300 text-center">{t.social.messagingLocked}</div>
              ) : (
                <form onSubmit={handleSendDM} className="pt-3 border-t border-white/10 flex gap-2">
                  <input
                    type="text"
                    value={dmInput}
                    onChange={(e) => setDmInput(e.target.value)}
                    placeholder={t.social.messagePlaceholder}
                    maxLength={400}
                    className="flex-1 h-11 px-4 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    aria-label="Send direct message"
                    className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold flex items-center justify-center cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageSquare className="w-8 h-8 text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-slate-300">{t.social.selectFriendTitle}</div>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">{t.social.selectFriendDesc}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
