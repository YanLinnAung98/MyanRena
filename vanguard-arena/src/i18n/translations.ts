import type { Language } from '../types.ts';

export interface TranslationDict {
  brandName: string;
  nav: {
    games: string;
    matchmaking: string;
    tournaments: string;
    rankings: string;
    lobby: string;
    leaderboard: string;
    social: string;
    profile: string;
    enterArena: string;
    signOut: string;
    adminPanel: string;
    playGames: string;
  };
  landing: {
    playersOnlineNow: string;
    lowLatency: string;
    rankedAndTournaments: string;
    competitiveTitles: string;
    competitiveTitlesDesc: string;
    featuredTitles: string;
    featuredTitlesDesc: string;
    signInToLaunch: string;
    rankedMatchmakingTitle: string;
    rankedMatchmakingDesc: string;
    knockoutTitle: string;
    knockoutDesc: string;
    friendsChatTitle: string;
    friendsChatDesc: string;
    resilienceTitle: string;
    resilienceDesc: string;
    footerNote: string;
    serverValidated: string;
  };
  auth: {
    signInTitle: string;
    signUpTitle: string;
    signIn: string;
    signUp: string;
    username: string;
    usernamePlaceholder: string;
    displayName: string;
    displayNamePlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    rememberMe: string;
    forgotPassword: string;
    authenticating: string;
    createAccount: string;
    continueGoogle: string;
    orDivider: string;
    recoveryTitle: string;
    recoveryByPin: string;
    recoveryByEmail: string;
    recoveryPinLabel: string;
    recoveryPinPlaceholder: string;
    newPasswordLabel: string;
    resetPasswordBtn: string;
    sendResetEmailBtn: string;
    emailLabel: string;
    pinModalTitle: string;
    pinModalDesc: string;
    pinSavedBtn: string;
    copyPin: string;
    copied: string;
  };
  lobby: {
    title: string;
    subtitle: string;
    searchingOpponent: string;
    matchingNearTier: string;
    cancelSearch: string;
    selected: string;
    maintenanceLocked: string;
    modesSuffix: string;
    chooseModeDesc: string;
    matchFormat: string;
    bestOf: string;
    turnTimer: string;
    playVsBot: string;
    easy: string;
    medium: string;
    hard: string;
    gameLocked: string;
    playVsBotBtn: string;
    randomMatchmaking: string;
    matchmakingLocked: string;
    findMatchBtn: string;
    onlineCompetitors: string;
    availablePlayers: string;
    filterPlaceholder: string;
    noPlayersOnline: string;
    add: string;
    challenge: string;
    inMatch: string;
    autoFillBotsLabel: string;
    autoFillBotsHint: string;
    realPlayersOnly: string;
    botBackfillIn: string;
    radarElapsed: string;
    radarMaxLimit: string;
    radarInQueue: string;
    noPlayersTimeoutToast: string;
  };
  match: {
    lobbyBtn: string;
    forfeit: string;
    reportPlayer: string;
    practice: string;
    tournamentMatch: string;
    livePvp: string;
    matchChat: string;
    graceTitle: string;
    graceDesc: string;
    turn: string;
    you: string;
    sendSticker: string;
    noMessagesYet: string;
    chatLocked: string;
    typeMessage: string;
    matchDrawn: string;
    victorySecured: string;
    matchConcluded: string;
    evenContest: string;
    wonMatch: string;
    earnedXp: string;
    rpChange: string;
    returnLobby: string;
    rpsRock: string;
    rpsPaper: string;
    rpsScissors: string;
    rpsSelectMove: string;
    rpsLockHint: string;
    rpsLockedPrefix: string;
    rpsWaitingPick: string;
    rpsOppLocked: string;
    rpsOppChoosing: string;
    rpsDrawRound: string;
    rpsWinsRound: string;
    rpsFirstTo: string;
    rpsRoundLabel: string;
    rpsBestOf: string;
    rpsClashRock: string;
    rpsClashPaper: string;
    rpsClashScissors: string;
  };
  tournament: {
    lockedTitle: string;
    comingSoonTitle: string;
    lockedDesc: string;
    comingSoonDesc: string;
    title: string;
    subtitle: string;
    scheduledStart: string;
    countdownLabel: string;
    eventLiveNow: string;
    autoStartLabel: string;
    manualStartLabel: string;
    roundsPerMatchLabel: string;
    turnLimitLabel: string;
    includedGamesLabel: string;
    withdraw: string;
    register: string;
    bracketFull: string;
    registeredCompetitors: string;
    firstToRegister: string;
    champion: string;
    playMatch: string;
    rejoinMatch: string;
    progressTableTitle: string;
    colRound: string;
    colMatchup: string;
    colGame: string;
    colScore: string;
    colStatus: string;
    colWinner: string;
  };
  leaderboard: {
    title: string;
    subtitle: string;
    tiersLine: string;
    empty: string;
    rank: string;
    competitor: string;
    tier: string;
    wld: string;
    winRate: string;
    xp: string;
  };
  rankGuide: {
    buttonLabel: string;
    title: string;
    subtitle: string;
    colTier: string;
    colThreshold: string;
    colBadge: string;
    rulesTitle: string;
    rulePvpWin: string;
    rulePvpLoss: string;
    ruleDraw: string;
    ruleBotWin: string;
    ruleBotLoss: string;
    currentTierBadge: string;
    yourRpLabel: string;
  };
  report: {
    modalTitle: string;
    modalDesc: string;
    categoryLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    catToxic: string;
    catCheating: string;
    catAfk: string;
    catProfile: string;
    snapshotNote: string;
    submitBtn: string;
    submitting: string;
    cancel: string;
    submittedToast: string;
  };
  moderation: {
    suspendedBannerTitle: string;
    suspendedBannerDesc: string;
    remainingTime: string;
    warningModalTitle: string;
    warningModalDesc: string;
    warningAckBtn: string;
    warningCounterLabel: string;
  };
  social: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchBtn: string;
    searching: string;
    results: string;
    clear: string;
    addFriend: string;
    pendingRequests: string;
    friendsTitle: string;
    noFriends: string;
    blockedPlayers: string;
    unblock: string;
    selectFriendTitle: string;
    selectFriendDesc: string;
    viewProfile: string;
    startChat: string;
    messagePlaceholder: string;
    messagingLocked: string;
  };
  profile: {
    totalXp: string;
    xpToNext: string;
    wins: string;
    losses: string;
    draws: string;
    winRate: string;
    uploadAvatar: string;
    customizeTitle: string;
    customizeDesc: string;
    displayName: string;
    frameSelector: string;
    unlocked: string;
    saveChanges: string;
    saving: string;
    recentHistory: string;
    noHistory: string;
    victory: string;
    defeat: string;
    draw: string;
  };
  admin: {
    controlPanel: string;
    adminPing: string;
    tabTelemetry: string;
    tabUsers: string;
    tabReports: string;
    tabLocks: string;
    tabTournaments: string;
    tabFrames: string;
    tabCms: string;
    tabRiddles: string;
    totalUsers: string;
    onlineUsers: string;
    activeDevices: string;
    serverHealth: string;
    broadcasterTitle: string;
    sendBroadcast: string;
    recentBroadcasts: string;
    userDirectory: string;
    kick: string;
    ban: string;
    unban: string;
    suspend: string;
    warn: string;
    downloadTemplate: string;
    cmsTitle: string;
    cmsDesc: string;
    saveCms: string;
    matchmakingConfigTitle: string;
    matchmakingConfigDesc: string;
    maxSearchSecondsLabel: string;
    botFillDelayLabel: string;
    autoBotFillDefaultLabel: string;
    saveMatchmakingBtn: string;
  };
  sakar: {
    playSoloBtn: string;
    quickMatchBtn: string;
    quickMatchSub: string;
    startNowBtn: string;
    customRoomsTitle: string;
    customRoomsSub: string;
    createRoomBtn: string;
    roomTitlePlaceholder: string;
    maxPlayersLabel: string;
    joinByIdPlaceholder: string;
    joinRoomBtn: string;
    openRoomsList: string;
    noOpenRooms: string;
    roomCodeLabel: string;
    copyRoomId: string;
    copiedRoomId: string;
    hostBadge: string;
    waitingSeat: string;
    startMatchBtn: string;
    leaveRoomBtn: string;
    kickPlayerBtn: string;
    preGameChatTitle: string;
    preGameChatPlaceholder: string;
    owlPresenterTitle: string;
    questionProgress: string;
    answerLocked: string;
    correctBadge: string;
    wrongBadge: string;
    officialAnswerLabel: string;
    podiumTitle: string;
    reviewTableTitle: string;
    colQuestion: string;
    colYourPick: string;
    colCorrectAnswer: string;
    colPoints: string;
    noAnswerPicked: string;
  };
  common: {
    reconnecting: string;
    directChallenge: string;
    wantsToPlay: string;
    decline: string;
    acceptMatch: string;
    loading: string;
  };
}

export const TRANSLATIONS: Record<Language, TranslationDict> = {
  en: {
    brandName: 'Vanguard Arena',
    nav: {
      games: 'Games',
      matchmaking: 'Matchmaking',
      tournaments: 'Tournaments',
      rankings: 'Rankings',
      lobby: 'Lobby',
      leaderboard: 'Leaderboard',
      social: 'Social',
      profile: 'Profile',
      enterArena: 'Enter Arena',
      signOut: 'Sign Out',
      adminPanel: 'Admin Control Panel',
      playGames: 'Play Games / Lobby',
    },
    landing: {
      playersOnlineNow: 'Players Online Now',
      lowLatency: 'Low-Latency WebSocket Arena',
      rankedAndTournaments: 'Ranked & Tournaments',
      competitiveTitles: 'Competitive Titles',
      competitiveTitlesDesc: 'Disconnect Grace',
      featuredTitles: 'Featured Competitive Titles',
      featuredTitlesDesc: 'Every move is validated server-side with animated feedback and adaptive AI practice bots.',
      signInToLaunch: 'Sign in to launch',
      rankedMatchmakingTitle: 'Ranked Matchmaking',
      rankedMatchmakingDesc: 'Real-time rank-weighted queue pairs you with balanced opponents and updates global standings live.',
      knockoutTitle: 'Knockout Tournaments',
      knockoutDesc: 'Scheduled 4-to-64 player single-elimination brackets with live round progress tables.',
      friendsChatTitle: 'Friends & Direct Chat',
      friendsChatDesc: 'Search players by unique Game ID, send direct challenges, manage friends, and message privately.',
      resilienceTitle: 'Network Resilience',
      resilienceDesc: 'Automatic exponential-backoff reconnection and a 30-second match grace timer protect against drops.',
      footerNote: 'Vanguard Arena — Real-Time Competitive Tabletop Platform',
      serverValidated: 'Server-authoritative match validation enabled',
    },
    auth: {
      signInTitle: 'Sign In to Play',
      signUpTitle: 'Create Player Account',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      username: 'Username',
      usernamePlaceholder: 'Enter username',
      displayName: 'Display Name',
      displayNamePlaceholder: 'Public arena callsign',
      password: 'Password',
      passwordPlaceholder: 'Enter password',
      rememberMe: 'Remember Me',
      forgotPassword: 'Forgot Password?',
      authenticating: 'Authenticating...',
      createAccount: 'Create Account',
      continueGoogle: 'Continue with Google',
      orDivider: 'or',
      recoveryTitle: 'Account Recovery',
      recoveryByPin: '6-Digit Recovery PIN',
      recoveryByEmail: 'Email Reset Link',
      recoveryPinLabel: '6-Digit Backup PIN',
      recoveryPinPlaceholder: 'Enter 6-digit PIN',
      newPasswordLabel: 'New Password',
      resetPasswordBtn: 'Reset Password',
      sendResetEmailBtn: 'Send Reset Link',
      emailLabel: 'Account Email',
      pinModalTitle: 'Save Your Backup Recovery PIN',
      pinModalDesc: 'Keep this one-time 6-digit PIN safe. You can use it with your username to recover your password anytime.',
      pinSavedBtn: 'I Saved My PIN — Enter Arena',
      copyPin: 'Copy PIN',
      copied: 'Copied',
    },
    lobby: {
      title: 'Arena Game Lobby',
      subtitle: 'Select a title to launch AI practice, ranked matchmaking, or challenge an online rival.',
      searchingOpponent: 'Searching for ranked opponent...',
      matchingNearTier: 'Matching against competitors near your Rank Tier.',
      cancelSearch: 'Cancel Search',
      selected: 'Selected',
      maintenanceLocked: 'Maintenance / Locked',
      modesSuffix: 'Modes',
      chooseModeDesc: 'Configure turn clock, bot difficulty, or enter the live ranked queue.',
      matchFormat: 'Match Format',
      bestOf: 'Best of',
      turnTimer: 'Turn Time Limit',
      playVsBot: 'Play vs. AI Bot',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      gameLocked: 'Game Locked',
      playVsBotBtn: 'vs Bot',
      randomMatchmaking: 'Random Ranked Matchmaking',
      matchmakingLocked: 'Matchmaking Locked',
      findMatchBtn: 'Find Match',
      onlineCompetitors: 'Online Competitors',
      availablePlayers: 'available players',
      filterPlaceholder: 'Filter name or #PLY...',
      noPlayersOnline: 'No other players online right now. Practice against our Minimax AI Bot or invite a friend!',
      add: 'Add',
      challenge: 'Challenge',
      inMatch: 'In Match',
      autoFillBotsLabel: 'Auto-Fill with Bots',
      autoFillBotsHint: 'Pairs you with a Burmese-named AI rival if no human joins in time.',
      realPlayersOnly: 'Real Players Only — Bot backfill disabled',
      botBackfillIn: 'AI rival fills in',
      radarElapsed: 'Elapsed',
      radarMaxLimit: 'Max Limit',
      radarInQueue: 'Queued',
      noPlayersTimeoutToast: 'No players found in time — returned to lobby.',
    },
    match: {
      lobbyBtn: 'Lobby',
      forfeit: 'Forfeit',
      reportPlayer: 'Report Player',
      practice: 'Practice',
      tournamentMatch: 'Tournament Bracket Match',
      livePvp: 'Live PvP Match',
      matchChat: 'Match Chat',
      graceTitle: 'Connection Drop Detected — Grace Period Active',
      graceDesc: 'Waiting for opponent to reconnect before awarding forfeit victory.',
      turn: 'Turn',
      you: '(You)',
      sendSticker: 'Send Reaction Sticker',
      noMessagesYet: 'No messages yet. Say good luck!',
      chatLocked: 'Chat is currently locked by an administrator.',
      typeMessage: 'Type message...',
      matchDrawn: 'Match Drawn',
      victorySecured: 'Victory Secured',
      matchConcluded: 'Match Concluded',
      evenContest: 'Even contest.',
      wonMatch: 'won the match.',
      earnedXp: 'Rank Update',
      rpChange: 'RP',
      returnLobby: 'Return to Lobby',
      rpsRock: 'Rock',
      rpsPaper: 'Paper',
      rpsScissors: 'Scissors',
      rpsSelectMove: 'Select Your Weapon',
      rpsLockHint: 'Both selections lock simultaneously before the 3-2-1 clash reveal',
      rpsLockedPrefix: 'Locked:',
      rpsWaitingPick: 'Choose Rock, Paper, or Scissors',
      rpsOppLocked: 'Rival locked in',
      rpsOppChoosing: 'Rival choosing...',
      rpsDrawRound: 'Stalemate Clash',
      rpsWinsRound: 'Wins Round',
      rpsFirstTo: 'First to',
      rpsRoundLabel: 'Round',
      rpsBestOf: 'Best of',
      rpsClashRock: 'Obsidian Shatter!',
      rpsClashPaper: 'Celestial Seal!',
      rpsClashScissors: 'Damascus Slash!',
    },
    tournament: {
      lockedTitle: 'Tournament Arena Locked',
      comingSoonTitle: 'No Active Event / Coming Soon',
      lockedDesc: 'The Tournament System is temporarily locked by platform administrators for maintenance or bracket preparation.',
      comingSoonDesc: 'No championship event is currently active. When an administrator opens registration, you can enter here and battle through the knockout bracket.',
      title: 'Championship Tournaments',
      subtitle: 'Track event countdowns, register for brackets, and watch round-by-round progress live.',
      scheduledStart: 'Scheduled Start',
      countdownLabel: 'Starts in',
      eventLiveNow: 'Bracket Live',
      autoStartLabel: 'Auto-Start on Countdown',
      manualStartLabel: 'Admin Manual Start',
      roundsPerMatchLabel: 'Best of',
      turnLimitLabel: 'Turn Limit',
      includedGamesLabel: 'Games',
      withdraw: 'Withdraw Registration',
      register: 'Register for Event',
      bracketFull: 'Bracket Full',
      registeredCompetitors: 'Registered Competitors',
      firstToRegister: 'Be the first competitor to register.',
      champion: 'Tournament Champion',
      playMatch: 'Play Match',
      rejoinMatch: 'Rejoin Match',
      progressTableTitle: 'Live Match Progress Table',
      colRound: 'Round',
      colMatchup: 'Matchup',
      colGame: 'Game',
      colScore: 'Series Score',
      colStatus: 'Status',
      colWinner: 'Advancing Winner',
    },
    leaderboard: {
      title: 'Global Leaderboard',
      subtitle: 'Live competitive rankings updating automatically as matches conclude.',
      tiersLine: 'Bronze · Silver · Gold · Platinum · Diamond · Master · Grandmaster · Mythic',
      empty: 'No ranked matches completed yet. Play a match to claim the top spot!',
      rank: 'Rank',
      competitor: 'Competitor',
      tier: 'Tier',
      wld: 'W / L / D',
      winRate: 'Win Rate',
      xp: 'RP',
    },
    rankGuide: {
      buttonLabel: 'View Rank Tiers & Rules',
      title: '8-Tier Competitive Rank Guide',
      subtitle: 'Climb from Bronze to Mythic by earning Rank Points (RP) across PvP, Ranked, and Tournament matches.',
      colTier: 'Rank Tier',
      colThreshold: 'RP Threshold',
      colBadge: 'Status',
      rulesTitle: 'Match RP Gain & Loss Rules',
      rulePvpWin: 'PvP / Ranked / Tournament Win: +75 RP',
      rulePvpLoss: 'PvP / Ranked / Tournament Loss: -20 RP (minimum 0 RP)',
      ruleDraw: 'Match Draw (PvP or Bot): +25 RP',
      ruleBotWin: 'AI Bot Practice Win: +35 RP',
      ruleBotLoss: 'AI Bot Practice Loss: +10 RP',
      currentTierBadge: 'Current Tier',
      yourRpLabel: 'Your Current RP',
    },
    report: {
      modalTitle: 'Report Opponent',
      modalDesc: 'Submit a moderation ticket. The full match chat transcript and move history log are attached automatically.',
      categoryLabel: 'Violation Category',
      notesLabel: 'Additional Details',
      notesPlaceholder: 'Describe what happened during the match...',
      catToxic: 'Toxic Chat / Harassment',
      catCheating: 'Cheating / Bug Abuse',
      catAfk: 'Intentional AFK / Stalling',
      catProfile: 'Inappropriate Profile',
      snapshotNote: 'Match chat log & move history will be snapshotted and attached to this report.',
      submitBtn: 'Submit Report Ticket',
      submitting: 'Submitting...',
      cancel: 'Cancel',
      submittedToast: 'Report submitted with full match transcript attached.',
    },
    moderation: {
      suspendedBannerTitle: 'Play Access Temporarily Suspended',
      suspendedBannerDesc: 'Matchmaking, direct challenges, and tournament matches are locked until your suspension expires.',
      remainingTime: 'Remaining',
      warningModalTitle: 'Official Moderator Warning',
      warningModalDesc: 'An administrator has issued an official conduct warning to your account. Further violations may lead to suspension or permanent ban.',
      warningAckBtn: 'I Understand & Acknowledge',
      warningCounterLabel: 'Warnings',
    },
    social: {
      title: 'Friends & Direct Messages',
      subtitle: 'Find players by exact Game ID (e.g. #PLY-84920) or username, manage requests, and chat live.',
      searchPlaceholder: 'Search by #PLY-XXXXX or username',
      searchBtn: 'Search',
      searching: 'Searching...',
      results: 'Search Results',
      clear: 'Clear',
      addFriend: 'Add Friend',
      pendingRequests: 'Pending Requests',
      friendsTitle: 'Friends',
      noFriends: 'No friends added yet. Search by Game ID above to connect with other competitors.',
      blockedPlayers: 'Blocked Players',
      unblock: 'Unblock',
      selectFriendTitle: 'Select a Friend to Chat',
      selectFriendDesc: 'Choose any accepted friend on the left to open real-time direct messaging.',
      viewProfile: 'View Profile',
      startChat: 'Start a private conversation with',
      messagePlaceholder: 'Type a direct message...',
      messagingLocked: 'Messaging is currently locked by an administrator.',
    },
    profile: {
      totalXp: 'Total RP',
      xpToNext: 'to Lv',
      wins: 'Wins',
      losses: 'Losses',
      draws: 'Draws',
      winRate: 'Win Rate',
      uploadAvatar: 'Upload Profile Picture',
      customizeTitle: 'Customize Competitor Identity',
      customizeDesc: 'Update your callsign and equip decorative avatar frames.',
      displayName: 'Display Name',
      frameSelector: 'Profile Frame Selector',
      unlocked: 'Unlocked',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      recentHistory: 'Recent Match History',
      noHistory: 'No completed matches yet.',
      victory: 'Victory',
      defeat: 'Defeat',
      draw: 'Draw',
    },
    admin: {
      controlPanel: 'Admin Control Panel',
      adminPing: 'Admin Ping',
      tabTelemetry: 'Telemetry & Broadcast',
      tabUsers: 'User Moderation',
      tabReports: 'Reports & Match Logs',
      tabLocks: 'Feature & Game Locks',
      tabTournaments: 'Tournament Manager',
      tabFrames: 'Profile Frame Manager',
      tabCms: 'Landing CMS',
      tabRiddles: 'Riddle Bank (စကားထာ)',
      totalUsers: 'Total Registered Users',
      onlineUsers: 'Live Online Users',
      activeDevices: 'Active Connected Devices',
      serverHealth: 'Server Health & Memory',
      broadcasterTitle: 'Notification Broadcaster',
      sendBroadcast: 'Send Real-Time Broadcast',
      recentBroadcasts: 'Recent Broadcasts',
      userDirectory: 'User Moderation Directory',
      kick: 'Kick',
      ban: 'Ban',
      unban: 'Unban',
      suspend: 'Suspend',
      warn: 'Warn',
      downloadTemplate: 'Download Sample Frame Template (.png)',
      cmsTitle: 'Landing Page Customizer (CMS)',
      cmsDesc: 'Edit the landing hero headline, bilingual game descriptions, and upload showcase banners live.',
      saveCms: 'Publish Landing Content',
      matchmakingConfigTitle: 'Smart Matchmaking & Bot Backfill Rules',
      matchmakingConfigDesc: 'Configure global queue timeout auto-exit and Burmese-named AI rival backfill timing.',
      maxSearchSecondsLabel: 'Max Search Timeout (sec)',
      botFillDelayLabel: 'Bot Backfill Delay (sec)',
      autoBotFillDefaultLabel: 'Default Auto-Fill with Bots',
      saveMatchmakingBtn: 'Save Matchmaking Config',
    },
    sakar: {
      playSoloBtn: 'Play Solo (10 Riddles)',
      quickMatchBtn: 'Quick Match (1–6 Players)',
      quickMatchSub: 'Race 1–6 players simultaneously across 10 riddles (15s each).',
      startNowBtn: 'Start Match Now',
      customRoomsTitle: 'Custom Riddle Rooms (Up to 8 Players)',
      customRoomsSub: 'Create a private courtyard room or join friends with a Room ID.',
      createRoomBtn: 'Create Custom Room',
      roomTitlePlaceholder: 'Room name (e.g. Yangon Scholars)',
      maxPlayersLabel: 'Max Seats',
      joinByIdPlaceholder: 'Enter #SKH-XXXX...',
      joinRoomBtn: 'Join Room',
      openRoomsList: 'Open Waiting Rooms',
      noOpenRooms: 'No public waiting rooms open yet. Create one above!',
      roomCodeLabel: 'Room ID',
      copyRoomId: 'Copy Room ID',
      copiedRoomId: 'Copied!',
      hostBadge: 'Room Leader',
      waitingSeat: 'Open Seat',
      startMatchBtn: 'Start Match',
      leaveRoomBtn: 'Leave Room',
      kickPlayerBtn: 'Kick',
      preGameChatTitle: 'Pre-Game Room Chat',
      preGameChatPlaceholder: 'Chat with players while waiting...',
      owlPresenterTitle: 'Wise Courtyard Owl',
      questionProgress: 'Riddle',
      answerLocked: 'Answer Locked — Waiting for Reveal',
      correctBadge: 'Correct!',
      wrongBadge: 'Missed',
      officialAnswerLabel: 'Official Answer (အဖြေမှန်)',
      podiumTitle: 'Final Courtyard Standings',
      reviewTableTitle: '10-Question Answer Review Table',
      colQuestion: 'Riddle Question',
      colYourPick: 'Your Answer',
      colCorrectAnswer: 'Official Answer (အဖြေမှန်)',
      colPoints: 'Points',
      noAnswerPicked: 'Timed Out',
    },
    common: {
      reconnecting: 'Reconnecting to real-time arena server...',
      directChallenge: 'Direct Challenge',
      wantsToPlay: 'Wants to play',
      decline: 'Decline',
      acceptMatch: 'Accept Match',
      loading: 'Loading Vanguard Arena...',
    },
  },
  my: {
    brandName: 'Vanguard Arena',
    nav: {
      games: 'ဂိမ်းများ',
      matchmaking: 'ပြိုင်ပွဲရှာမည်',
      tournaments: 'ပြိုင်ပွဲကြီးများ',
      rankings: 'အဆင့်သတ်မှတ်ချက်',
      lobby: 'ဂိမ်းခန်းမ',
      leaderboard: 'ထိပ်တန်းစာရင်း',
      social: 'မိတ်ဆွေများ',
      profile: 'ကိုယ်ရေးအချက်အလက်',
      enterArena: 'ကစားခန်းဝင်မည်',
      signOut: 'ထွက်မည်',
      adminPanel: 'စီမံခန့်ခွဲမှုစနစ်',
      playGames: 'ဂိမ်းကစားရန် / ခန်းမ',
    },
    landing: {
      playersOnlineNow: 'လက်ရှိအွန်လိုင်းကစားသူများ',
      lowLatency: 'မြန်နှုန်းမြင့် WebSocket ဂိမ်းစနစ်',
      rankedAndTournaments: 'အဆင့်မြှင့်ပွဲစဉ်နှင့် ပြိုင်ပွဲများ',
      competitiveTitles: 'ပြိုင်ပွဲဝင်ဂိမ်းများ',
      competitiveTitlesDesc: 'ချိတ်ဆက်မှုပြတ်တောက်ချိန် ခွင့်ပြုချက်',
      featuredTitles: 'ထိပ်တန်းပြိုင်ပွဲဝင် ဂိမ်းများ',
      featuredTitlesDesc: 'ကစားကွက်တိုင်းကို ဆာဗာမှတိုက်ရိုက်စစ်ဆေးပြီး AI Bot များဖြင့်လည်း လေ့ကျင့်နိုင်ပါသည်။',
      signInToLaunch: 'ကစားရန် အကောင့်ဝင်ပါ',
      rankedMatchmakingTitle: 'အဆင့်တူ ပြိုင်ဘက်ရှာဖွေခြင်း',
      rankedMatchmakingDesc: 'မိမိအဆင့်နှင့်ကိုက်ညီသော ပြိုင်ဘက်များကို အချိန်နှင့်တပြေးညီ တွဲဖက်ကစားနိုင်ပါသည်။',
      knockoutTitle: 'ရှုံးထွက်ပြိုင်ပွဲစနစ်',
      knockoutDesc: 'ကစားသမား ၄ ဦးမှ ၆၄ ဦးအထိ အချိန်ဇယားနှင့် တိုက်ရိုက်ပြိုင်ပွဲဇယားဖြင့် ယှဉ်ပြိုင်နိုင်ပါသည်။',
      friendsChatTitle: 'မိတ်ဆွေများနှင့် တိုက်ရိုက်စကားပြောခြင်း',
      friendsChatDesc: 'Game ID ဖြင့်ရှာဖွေပြီး စိန်ခေါ်ခြင်း၊ မိတ်ဆွေဖွဲ့ခြင်းနှင့် သီးသန့်စာပို့ခြင်းများ ပြုလုပ်နိုင်ပါသည်။',
      resilienceTitle: 'ကွန်ရက်တည်ငြိမ်မှုစနစ်',
      resilienceDesc: 'အင်တာနက်ပြတ်တောက်ပါက အလိုအလျောက်ပြန်လည်ချိတ်ဆက်ပြီး စက္ကန့် ၃၀ စောင့်ဆိုင်းပေးပါသည်။',
      footerNote: 'Vanguard Arena — အချိန်နှင့်တပြေးညီ အွန်လိုင်းဂိမ်းပလက်ဖောင်း',
      serverValidated: 'ဆာဗာမှ ကစားကွက်စစ်ဆေးမှုစနစ် ဖွင့်ထားသည်',
    },
    auth: {
      signInTitle: 'အကောင့်ဝင်ရောက်ရန်',
      signUpTitle: 'အကောင့်သစ်ဖွင့်ရန်',
      signIn: 'အကောင့်ဝင်မည်',
      signUp: 'အကောင့်ဖွင့်မည်',
      username: 'အသုံးပြုသူအမည်',
      usernamePlaceholder: 'အသုံးပြုသူအမည် ရိုက်ထည့်ပါ',
      displayName: 'ပြသမည့်အမည်',
      displayNamePlaceholder: 'ကစားသမားအမည် ရိုက်ထည့်ပါ',
      password: 'စကားဝှက်',
      passwordPlaceholder: 'စကားဝှက် ရိုက်ထည့်ပါ',
      rememberMe: 'အကောင့်ကို မှတ်သားထားမည်',
      forgotPassword: 'စကားဝှက်မေ့နေပါသလား?',
      authenticating: 'စစ်ဆေးနေပါသည်...',
      createAccount: 'အကောင့်ဖွင့်မည်',
      continueGoogle: 'Google ဖြင့် ဆက်လက်ဝင်မည်',
      orDivider: 'သို့မဟုတ်',
      recoveryTitle: 'အကောင့်ပြန်လည်ရယူခြင်း',
      recoveryByPin: 'ဂဏန်း ၆ လုံး PIN ဖြင့်',
      recoveryByEmail: 'အီးမေးလ်လင့်ခ်ဖြင့်',
      recoveryPinLabel: 'ဂဏန်း ၆ လုံး အရန် PIN',
      recoveryPinPlaceholder: 'PIN ၆ လုံး ရိုက်ထည့်ပါ',
      newPasswordLabel: 'စကားဝှက်အသစ်',
      resetPasswordBtn: 'စကားဝှက် ပြောင်းလဲမည်',
      sendResetEmailBtn: 'ပြန်လည်သတ်မှတ်ရန် အီးမေးလ်ပို့မည်',
      emailLabel: 'အကောင့်အီးမေးလ်',
      pinModalTitle: 'အရန် Recovery PIN ကို သိမ်းဆည်းထားပါ',
      pinModalDesc: 'ဤဂဏန်း ၆ လုံး PIN ကို လုံခြုံစွာသိမ်းဆည်းပါ။ စကားဝှက်မေ့သွားပါက ပြန်လည်ရယူရန် အသုံးပြုနိုင်ပါသည်။',
      pinSavedBtn: 'PIN ကို သိမ်းပြီးပါပြီ — ကစားခန်းဝင်မည်',
      copyPin: 'PIN ကူးယူမည်',
      copied: 'ကူးယူပြီးပါပြီ',
    },
    lobby: {
      title: 'ဂိမ်းကစားခန်းမ',
      subtitle: 'AI Bot ဖြင့်လေ့ကျင့်ရန်၊ ပြိုင်ဘက်ရှာရန် သို့မဟုတ် အွန်လိုင်းကစားသမားများကို စိန်ခေါ်ရန် ဂိမ်းရွေးချယ်ပါ။',
      searchingOpponent: 'အဆင့်တူ ပြိုင်ဘက် ရှာဖွေနေပါသည်...',
      matchingNearTier: 'သင်၏ Rank Tier နှင့် နီးစပ်သော ကစားသမားကို တွဲဖက်နေပါသည်။',
      cancelSearch: 'ရှာဖွေမှု ရပ်မည်',
      selected: 'ရွေးချယ်ထားသည်',
      maintenanceLocked: 'ပြုပြင်ထိန်းသိမ်းနေသည် / ပိတ်ထားသည်',
      modesSuffix: 'ကစားနည်းများ',
      chooseModeDesc: 'အလှည့်အချိန်ကန့်သတ်ချက်နှင့် Bot အဆင့်ရွေးချယ်ပါ သို့မဟုတ် အွန်လိုင်းပြိုင်ပွဲဝင်ပါ။',
      matchFormat: 'ပွဲစဉ်ပုံစံ',
      bestOf: 'အကောင်းဆုံး',
      turnTimer: 'တစ်လှည့် အချိန်ကန့်သတ်ချက်',
      playVsBot: 'AI Bot နှင့် ကစားမည်',
      easy: 'အလွယ်',
      medium: 'အလယ်အလတ်',
      hard: 'အခက်',
      gameLocked: 'ဂိမ်းပိတ်ထားသည်',
      playVsBotBtn: 'Bot နှင့်ကစားမည်',
      randomMatchmaking: 'အွန်လိုင်း ကျပန်းပြိုင်ဘက်ရှာမည်',
      matchmakingLocked: 'ပြိုင်ဘက်ရှာစနစ် ပိတ်ထားသည်',
      findMatchBtn: 'ပြိုင်ဘက်ရှာမည်',
      onlineCompetitors: 'အွန်လိုင်းကစားသမားများ',
      availablePlayers: 'ကစားသမား ရှိသည်',
      filterPlaceholder: 'အမည် သို့မဟုတ် #PLY... ရှာပါ',
      noPlayersOnline: 'လက်ရှိတွင် အခြားကစားသမား မရှိသေးပါ။ AI Bot ဖြင့် လေ့ကျင့်နိုင်ပါသည်။',
      add: 'မိတ်ဆွေဖွဲ့',
      challenge: 'စိန်ခေါ်မည်',
      inMatch: 'ကစားနေသည်',
      autoFillBotsLabel: 'Bot များဖြင့် အလိုအလျောက်ဖြည့်မည်',
      autoFillBotsHint: 'အချိန်မီ လူမပြည့်ပါက မြန်မာအမည်ရှိ AI ပြိုင်ဘက်နှင့် တွဲဖက်ပေးပါမည်။',
      realPlayersOnly: 'တကယ့်ကစားသမားများသာ — AI Bot မဖြည့်ပါ',
      botBackfillIn: 'AI ပြိုင်ဘက် ဝင်ရောက်ရန်',
      radarElapsed: 'ကြာချိန်',
      radarMaxLimit: 'အများဆုံး',
      radarInQueue: 'စောင့်ဆိုင်းသူ',
      noPlayersTimeoutToast: 'သတ်မှတ်ချိန်အတွင်း ကစားသမားမတွေ့သဖြင့် ခန်းမသို့ ပြန်ရောက်ပါပြီ။',
    },
    match: {
      lobbyBtn: 'ခန်းမသို့',
      forfeit: 'အရှုံးပေးမည်',
      reportPlayer: 'တိုင်ကြားမည်',
      practice: 'လေ့ကျင့်ပွဲ',
      tournamentMatch: 'ပြိုင်ပွဲဇယား ပွဲစဉ်',
      livePvp: 'တိုက်ရိုက် PvP ပွဲစဉ်',
      matchChat: 'ပွဲတွင်းစကားပြောခန်း',
      graceTitle: 'ချိတ်ဆက်မှုပြတ်တောက်နေသည် — စောင့်ဆိုင်းချိန်',
      graceDesc: 'ပြိုင်ဘက် ပြန်လည်ချိတ်ဆက်လာရန် စောင့်ဆိုင်းနေပါသည်။',
      turn: 'အလှည့်',
      you: '(သင်)',
      sendSticker: 'စတစ်ကာ ပို့မည်',
      noMessagesYet: 'စာမရှိသေးပါ။ နှုတ်ဆက်စကားပြောပါ။',
      chatLocked: 'စကားပြောခန်းကို စီမံခန့်ခွဲသူမှ ပိတ်ထားပါသည်။',
      typeMessage: 'စာရိုက်ထည့်ပါ...',
      matchDrawn: 'သရေပွဲဖြစ်ပါသည်',
      victorySecured: 'အနိုင်ရရှိပါပြီ',
      matchConcluded: 'ပွဲစဉ်ပြီးဆုံးပါပြီ',
      evenContest: 'အကြိတ်အနယ် သရေကျခဲ့ပါသည်။',
      wonMatch: 'ပွဲစဉ်အနိုင်ရရှိသွားပါသည်။',
      earnedXp: 'Rank ပြောင်းလဲမှု',
      rpChange: 'RP',
      returnLobby: 'ခန်းမသို့ ပြန်မည်',
      rpsRock: 'ကျောက်တုံး',
      rpsPaper: 'စက္ကူ',
      rpsScissors: 'ကတ်ကြေး',
      rpsSelectMove: 'သင်၏ လက်နက်ကို ရွေးချယ်ပါ',
      rpsLockHint: 'နှစ်ဦးစလုံး ရွေးချယ်ပြီးပါက ၃-၂-၁ ရေတွက်ပြီး တပြိုင်နက် ဖွင့်ပြပါမည်',
      rpsLockedPrefix: 'ရွေးချယ်ပြီး —',
      rpsWaitingPick: 'ကျောက်တုံး၊ စက္ကူ သို့မဟုတ် ကတ်ကြေး ရွေးပါ',
      rpsOppLocked: 'ပြိုင်ဘက် ရွေးပြီးပါပြီ',
      rpsOppChoosing: 'ပြိုင်ဘက် ရွေးချယ်နေသည်...',
      rpsDrawRound: 'သရေပွဲ ဖြစ်သွားပါသည်',
      rpsWinsRound: 'အနိုင်ရရှိသည်',
      rpsFirstTo: 'အရင်နိုင်ရမည့်ပွဲ —',
      rpsRoundLabel: 'အချီ',
      rpsBestOf: 'ပွဲစဉ် Bo',
      rpsClashRock: 'ကျောက်တုံးဖြင့် ထုခွဲအနိုင်ယူ!',
      rpsClashPaper: 'ရွှေစက္ကူဖြင့် ထုပ်ပိုးအနိုင်ယူ!',
      rpsClashScissors: 'ဓားကတ်ကြေးဖြင့် ဖြတ်တောက်အနိုင်ယူ!',
    },
    tournament: {
      lockedTitle: 'ပြိုင်ပွဲစနစ် ပိတ်ထားပါသည်',
      comingSoonTitle: 'လက်ရှိပြိုင်ပွဲ မရှိသေးပါ / မကြာမီလာမည်',
      lockedDesc: 'ပြိုင်ပွဲစနစ်ကို စီမံခန့်ခွဲသူမှ ယာယီပိတ်ထားပါသည်။',
      comingSoonDesc: 'လက်ရှိတွင် ပြိုင်ပွဲကြီးမရှိသေးပါ။ စာရင်းသွင်းခွင့်ဖွင့်ချိန်တွင် ရှုံးထွက်ဇယားဖြင့် ဝင်ရောက်ယှဉ်ပြိုင်နိုင်ပါသည်။',
      title: 'ချန်ပီယံရှစ် ပြိုင်ပွဲများ',
      subtitle: 'စတင်မည့်အချိန်ကို စောင့်ကြည့်ပြီး စာရင်းသွင်းကာ ရှုံးထွက်ဇယားနှင့် ပွဲစဉ်တိုးတက်မှုကို တိုက်ရိုက်ကြည့်ရှုပါ။',
      scheduledStart: 'စတင်မည့်အချိန်',
      countdownLabel: 'စတင်ရန် ကျန်ရှိချိန်',
      eventLiveNow: 'ပြိုင်ပွဲ စတင်နေပါပြီ',
      autoStartLabel: 'အချိန်ပြည့်လျှင် အလိုအလျောက်စတင်မည်',
      manualStartLabel: 'Admin မှ စတင်မည်',
      roundsPerMatchLabel: 'ပွဲစဉ်ပုံစံ Bo',
      turnLimitLabel: 'အလှည့်အချိန်',
      includedGamesLabel: 'ပါဝင်သောဂိမ်းများ',
      withdraw: 'စာရင်းပယ်ဖျက်မည်',
      register: 'ပြိုင်ပွဲစာရင်းသွင်းမည်',
      bracketFull: 'လူပြည့်သွားပါပြီ',
      registeredCompetitors: 'စာရင်းသွင်းထားသော ကစားသမားများ',
      firstToRegister: 'ပထမဆုံး စာရင်းသွင်းသူ ဖြစ်လိုက်ပါ။',
      champion: 'ပြိုင်ပွဲ ချန်ပီယံ',
      playMatch: 'ပွဲစဉ်ကစားမည်',
      rejoinMatch: 'ပွဲစဉ်သို့ ပြန်ဝင်မည်',
      progressTableTitle: 'တိုက်ရိုက် ပွဲစဉ်တိုးတက်မှု ဇယား',
      colRound: 'အဆင့်',
      colMatchup: 'ယှဉ်ပြိုင်သူများ',
      colGame: 'ဂိမ်း',
      colScore: 'ရမှတ်',
      colStatus: 'အခြေအနေ',
      colWinner: 'တက်ရောက်သူ',
    },
    leaderboard: {
      title: 'ကမ္ဘာလုံးဆိုင်ရာ ထိပ်တန်းစာရင်း',
      subtitle: 'ပွဲစဉ်များပြီးဆုံးသည်နှင့် အဆင့်သတ်မှတ်ချက်များ အချိန်နှင့်တပြေးညီ ပြောင်းလဲပါသည်။',
      tiersLine: 'Bronze · Silver · Gold · Platinum · Diamond · Master · Grandmaster · Mythic',
      empty: 'အဆင့်သတ်မှတ်ပွဲစဉ် မရှိသေးပါ။ ပွဲစဉ်ကစားပြီး ထိပ်ဆုံးနေရာယူပါ။',
      rank: 'အဆင့်',
      competitor: 'ကစားသမား',
      tier: 'အဆင့်တန်း',
      wld: 'နိုင် / ရှုံး / သရေ',
      winRate: 'နိုင်နှုန်း',
      xp: 'RP',
    },
    rankGuide: {
      buttonLabel: 'Rank အဆင့်များနှင့် စည်းမျဉ်းကြည့်ရန်',
      title: 'Rank အဆင့် ၈ ဆင့်နှင့် စည်းမျဉ်းလမ်းညွှန်',
      subtitle: 'PvP နှင့် ပြိုင်ပွဲများမှ Rank Points (RP) စုဆောင်းပြီး Bronze မှ Mythic အဆင့်အထိ တက်လှမ်းပါ။',
      colTier: 'Rank အဆင့်',
      colThreshold: 'RP အမှတ်အပိုင်းအခြား',
      colBadge: 'အခြေအနေ',
      rulesTitle: 'ပွဲစဉ် RP အတိုး / အလျော့ စည်းမျဉ်းများ',
      rulePvpWin: 'PvP / Ranked / ပြိုင်ပွဲ အနိုင်ရလျှင်: +75 RP',
      rulePvpLoss: 'PvP / Ranked / ပြိုင်ပွဲ ရှုံးလျှင်: -20 RP (အနည်းဆုံး 0 RP)',
      ruleDraw: 'သရေပွဲဖြစ်လျှင် (PvP သို့မဟုတ် Bot): +25 RP',
      ruleBotWin: 'AI Bot လေ့ကျင့်ပွဲ အနိုင်ရလျှင်: +35 RP',
      ruleBotLoss: 'AI Bot လေ့ကျင့်ပွဲ ရှုံးလျှင်: +10 RP',
      currentTierBadge: 'လက်ရှိအဆင့်',
      yourRpLabel: 'သင်၏ လက်ရှိ RP',
    },
    report: {
      modalTitle: 'ကစားသမားအား တိုင်ကြားရန်',
      modalDesc: 'စည်းကမ်းထိန်းသိမ်းရေးသို့ တိုင်ကြားလွှာပေးပို့ပါ။ ပွဲစဉ်စကားပြောမှတ်တမ်းနှင့် ကစားကွက်မှတ်တမ်းအပြည့်အစုံကို အလိုအလျောက် ပူးတွဲပေးပို့ပါမည်။',
      categoryLabel: 'တိုင်ကြားသည့် အကြောင်းအရာ',
      notesLabel: 'အသေးစိတ် မှတ်ချက်',
      notesPlaceholder: 'ပွဲစဉ်အတွင်း ဖြစ်ပွားခဲ့သည့် အခြေအနေကို ရေးသားပါ...',
      catToxic: 'ရိုင်းစိုင်းစွာ စကားပြောခြင်း / နှောင့်ယှက်ခြင်း',
      catCheating: 'လှည့်ဖြားခြင်း / Bug အလွဲသုံးစားလုပ်ခြင်း',
      catAfk: 'တမင်အချိန်ဆွဲခြင်း / AFK ဖြစ်နေခြင်း',
      catProfile: 'မသင့်လျော်သော ပရိုဖိုင်',
      snapshotNote: 'ပွဲတွင်း စကားပြောမှတ်တမ်းနှင့် ကစားကွက်မှတ်တမ်းအပြည့်အစုံကို ဤတိုင်ကြားလွှာနှင့် ပူးတွဲပေးပို့ပါမည်။',
      submitBtn: 'တိုင်ကြားလွှာ ပေးပို့မည်',
      submitting: 'ပေးပို့နေသည်...',
      cancel: 'မလုပ်တော့ပါ',
      submittedToast: 'ပွဲစဉ်မှတ်တမ်းအပြည့်အစုံနှင့်အတူ တိုင်ကြားလွှာ ပေးပို့ပြီးပါပြီ။',
    },
    moderation: {
      suspendedBannerTitle: 'ကစားခွင့် ယာယီပိတ်ပင်ခံထားရသည်',
      suspendedBannerDesc: 'သတ်မှတ်ချိန် မပြည့်မချင်း ပြိုင်ဘက်ရှာခြင်း၊ စိန်ခေါ်ခြင်းနှင့် ပြိုင်ပွဲကစားခြင်းများ ပိတ်ထားပါမည်။',
      remainingTime: 'ကျန်ရှိချိန်',
      warningModalTitle: 'စီမံခန့်ခွဲသူထံမှ တရားဝင် သတိပေးချက်',
      warningModalDesc: 'သင်၏အကောင့်သို့ စည်းကမ်းထိန်းသိမ်းရေးမှ တရားဝင်သတိပေးချက် ပေးပို့ထားပါသည်။ ထပ်မံချိုးဖောက်ပါက အကောင့်ပိတ်ပင်ခံရနိုင်ပါသည်။',
      warningAckBtn: 'နားလည်သဘောပေါက်ပါသည်',
      warningCounterLabel: 'သတိပေးချက်',
    },
    social: {
      title: 'မိတ်ဆွေများနှင့် တိုက်ရိုက်စာပို့ခြင်း',
      subtitle: 'Game ID (#PLY-84920) သို့မဟုတ် အမည်ဖြင့် ရှာဖွေပြီး မိတ်ဆွေဖွဲ့ကာ စကားပြောနိုင်ပါသည်။',
      searchPlaceholder: '#PLY-XXXXX သို့မဟုတ် အမည်ရိုက်ရှာပါ',
      searchBtn: 'ရှာမည်',
      searching: 'ရှာဖွေနေသည်...',
      results: 'ရှာဖွေမှု ရလဒ်များ',
      clear: 'ရှင်းလင်းမည်',
      addFriend: 'မိတ်ဆွေဖွဲ့မည်',
      pendingRequests: 'မိတ်ဆွေတောင်းဆိုမှုများ',
      friendsTitle: 'မိတ်ဆွေများ',
      noFriends: 'မိတ်ဆွေ မရှိသေးပါ။ Game ID ဖြင့် ရှာဖွေပြီး မိတ်ဆွေဖွဲ့ပါ။',
      blockedPlayers: 'ပိတ်ဆို့ထားသူများ',
      unblock: 'ပြန်ဖွင့်မည်',
      selectFriendTitle: 'စကားပြောရန် မိတ်ဆွေရွေးပါ',
      selectFriendDesc: 'ဘယ်ဘက်စာရင်းမှ မိတ်ဆွေတစ်ဦးကို ရွေးချယ်ပြီး တိုက်ရိုက်စာပို့နိုင်ပါသည်။',
      viewProfile: 'ပရိုဖိုင်ကြည့်မည်',
      startChat: 'သီးသန့်စကားစတင်ပြောဆိုပါ —',
      messagePlaceholder: 'စာရိုက်ထည့်ပါ...',
      messagingLocked: 'စာပို့စနစ်ကို စီမံခန့်ခွဲသူမှ ပိတ်ထားပါသည်။',
    },
    profile: {
      totalXp: 'စုစုပေါင်း RP',
      xpToNext: 'အဆင့်တက်ရန်',
      wins: 'နိုင်ပွဲ',
      losses: 'ရှုံးပွဲ',
      draws: 'သရေ',
      winRate: 'နိုင်နှုန်း',
      uploadAvatar: 'ပရိုဖိုင်ပုံ တင်မည်',
      customizeTitle: 'ကစားသမားအချက်အလက် ပြင်ဆင်ရန်',
      customizeDesc: 'ပြသမည့်အမည်ကို ပြောင်းလဲပြီး အလှဆင်ပရိုဖိုင်ဘောင်များ တပ်ဆင်ပါ။',
      displayName: 'ပြသမည့်အမည်',
      frameSelector: 'ပရိုဖိုင်ဘောင် ရွေးချယ်ရန်',
      unlocked: 'ဖွင့်ပြီး',
      saveChanges: 'သိမ်းဆည်းမည်',
      saving: 'သိမ်းဆည်းနေသည်...',
      recentHistory: 'မကြာသေးမီ ပွဲစဉ်မှတ်တမ်း',
      noHistory: 'ပြီးဆုံးထားသော ပွဲစဉ်မရှိသေးပါ။',
      victory: 'အနိုင်',
      defeat: 'အရှုံး',
      draw: 'သရေ',
    },
    admin: {
      controlPanel: 'စီမံခန့်ခွဲမှုစနစ်',
      adminPing: 'Admin Ping',
      tabTelemetry: 'စနစ်အခြေအနေနှင့် ကြေညာချက်',
      tabUsers: 'အသုံးပြုသူ စီမံခန့်ခွဲမှု',
      tabReports: 'တိုင်ကြားလွှာနှင့် ပွဲမှတ်တမ်းများ',
      tabLocks: 'ဂိမ်းနှင့်စနစ် အဖွင့်/အပိတ်',
      tabTournaments: 'ပြိုင်ပွဲ စီမံခန့်ခွဲမှု',
      tabFrames: 'ပရိုဖိုင်ဘောင် စီမံခန့်ခွဲမှု',
      tabCms: 'Landing CMS',
      tabRiddles: 'စကားထာဘဏ် စီမံခန့်ခွဲမှု',
      totalUsers: 'စုစုပေါင်း ကစားသမား',
      onlineUsers: 'လက်ရှိ အွန်လိုင်းကစားသမား',
      activeDevices: 'ချိတ်ဆက်ထားသော စက်အရေအတွက်',
      serverHealth: 'ဆာဗာ ကျန်းမာရေးနှင့် မမ်မိုရီ',
      broadcasterTitle: 'အသိပေးချက် ထုတ်လွှင့်စနစ်',
      sendBroadcast: 'တိုက်ရိုက် အသိပေးချက် ပို့မည်',
      recentBroadcasts: 'မကြာသေးမီ ကြေညာချက်များ',
      userDirectory: 'အသုံးပြုသူ စာရင်း',
      kick: 'ထုတ်မည်',
      ban: 'ပိတ်ပင်မည်',
      unban: 'ပြန်ဖွင့်မည်',
      suspend: 'ယာယီပိတ်မည်',
      warn: 'သတိပေးမည်',
      downloadTemplate: 'နမူနာ Frame Template (.png) ဒေါင်းလုဒ်လုပ်မည်',
      cmsTitle: 'Landing Page ပြင်ဆင်ရန် (CMS)',
      cmsDesc: 'Landing စာမျက်နှာ ခေါင်းစဉ်၊ အင်္ဂလိပ်/မြန်မာ ဂိမ်းဖော်ပြချက်များနှင့် ပုံများကို တိုက်ရိုက်ပြောင်းလဲပါ။',
      saveCms: 'Landing Page ကို အသစ်တင်မည်',
      matchmakingConfigTitle: 'Smart Matchmaking နှင့် AI Bot စနစ်ချိန်ညှိခြင်း',
      matchmakingConfigDesc: 'ပြိုင်ဘက်ရှာဖွေချိန် ကန့်သတ်ချက်နှင့် မြန်မာအမည်ရှိ AI Bot ဖြည့်သွင်းချိန်ကို သတ်မှတ်ပါ။',
      maxSearchSecondsLabel: 'အများဆုံး ရှာဖွေချိန် (စက္ကန့်)',
      botFillDelayLabel: 'AI Bot ဖြည့်သွင်းချိန် (စက္ကန့်)',
      autoBotFillDefaultLabel: 'AI Bot ဖြင့် အလိုအလျောက်ဖြည့်ရန် မူရင်းဖွင့်ထားမည်',
      saveMatchmakingBtn: 'Matchmaking စနစ် သိမ်းဆည်းမည်',
    },
    sakar: {
      playSoloBtn: 'တစ်ဦးတည်း ကစားမည် (၁၀ ပုဒ်)',
      quickMatchBtn: 'အမြန်ပွဲရှာမည် (၁–၆ ဦး)',
      quickMatchSub: 'စကားထာ ၁၀ ပုဒ် (၁၅ စက္ကန့်စီ) ကို ကစားသမား ၁ မှ ၆ ဦးအထိ ယှဉ်ပြိုင်ပါ။',
      startNowBtn: 'ယခု စတင်မည်',
      customRoomsTitle: 'စိတ်ကြိုက်အခန်းများ (၈ ဦးအထိ)',
      customRoomsSub: 'ကိုယ်ပိုင်စကားထာအခန်း ဖန်တီးပါ သို့မဟုတ် Room ID ဖြင့် ဝင်ရောက်ပါ။',
      createRoomBtn: 'အခန်းသစ် ဖန်တီးမည်',
      roomTitlePlaceholder: 'အခန်းအမည် (ဥပမာ - ရန်ကုန်ဉာဏ်စမ်း)',
      maxPlayersLabel: 'အများဆုံး လူဦးရေ',
      joinByIdPlaceholder: '#SKH-XXXX ရိုက်ထည့်ပါ...',
      joinRoomBtn: 'အခန်းဝင်မည်',
      openRoomsList: 'စောင့်ဆိုင်းနေသော အခန်းများ',
      noOpenRooms: 'လက်ရှိဖွင့်ထားသော အခန်းမရှိသေးပါ။ အပေါ်တွင် အခန်းသစ်ဖန်တီးနိုင်ပါသည်။',
      roomCodeLabel: 'Room ID',
      copyRoomId: 'Room ID ကူးယူမည်',
      copiedRoomId: 'ကူးယူပြီးပါပြီ!',
      hostBadge: 'အခန်းခေါင်းဆောင်',
      waitingSeat: 'လွတ်နေသော နေရာ',
      startMatchBtn: 'ပြိုင်ပွဲ စတင်မည်',
      leaveRoomBtn: 'အခန်းမှ ထွက်မည်',
      kickPlayerBtn: 'ထုတ်မည်',
      preGameChatTitle: 'ပွဲမစမီ အခန်းတွင်း စကားပြောခန်း',
      preGameChatPlaceholder: 'စောင့်ဆိုင်းနေစဉ် စကားပြောပါ...',
      owlPresenterTitle: 'ပညာရှိ ဇီးကွက်ဆရာ',
      questionProgress: 'ပုစ္ဆာ',
      answerLocked: 'အဖြေလော့ခ်ချပြီး — အဖြေဖွင့်ပြရန် စောင့်ဆိုင်းနေသည်',
      correctBadge: 'မှန်ကန်ပါသည်!',
      wrongBadge: 'လွဲချော်သွားပါသည်',
      officialAnswerLabel: 'အဖြေမှန်',
      podiumTitle: 'နောက်ဆုံး ရမှတ်နှင့် အနိုင်ရရှိသူများ',
      reviewTableTitle: 'မေးခွန်း ၁၀ ခု အဖြေမှန် စစ်ဆေးဇယား',
      colQuestion: 'စကားထာ မေးခွန်း',
      colYourPick: 'သင်ရွေးချယ်ခဲ့သော အဖြေ',
      colCorrectAnswer: 'အဖြေမှန်',
      colPoints: 'ရမှတ်',
      noAnswerPicked: 'အချိန်ကုန်',
    },
    common: {
      reconnecting: 'ဂိမ်းဆာဗာသို့ ပြန်လည်ချိတ်ဆက်နေပါသည်...',
      directChallenge: 'တိုက်ရိုက်စိန်ခေါ်မှု',
      wantsToPlay: 'ကစားရန် စိန်ခေါ်နေပါသည် —',
      decline: 'ငြင်းပယ်မည်',
      acceptMatch: 'လက်ခံကစားမည်',
      loading: 'Vanguard Arena ကို ဖွင့်နေပါသည်...',
    },
  },
};
