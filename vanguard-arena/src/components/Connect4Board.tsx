{/* === Game Stage Wrapper (ကလေး + ဘုတ်ကို အချိုးတူ တွဲချိတ်ထားမည်) === */}
<div className="relative w-full max-w-[540px] mx-auto flex flex-col items-center justify-end">
  
  {/* 1. BOT KID LAYER (ဘုတ်နောက်ကွယ် z-10 တွင် ထိုင်နေမည်) */}
  <motion.div
    animate={{
      x: kidShiftX, // ကော်လံအလိုက် ဘယ်/ညာ ရွေ့ရန်
      y: kidMood === 'idle' ? [0, -3, 0] : 0,
    }}
    transition={{
      x: { type: 'spring', stiffness: 180, damping: 22 },
      y: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' },
    }}
    className="relative z-10 w-[58%] sm:w-[56%] aspect-square -mb-[20%] sm:-mb-[19%] pointer-events-none select-none flex items-end justify-center"
  >
    {/* ကလေးပုံ သို့မဟုတ် Video */}
    <img
      src={activeKidSrc}
      alt="Maung Pho Thar"
      className="w-full h-full object-contain object-bottom drop-shadow-[0_12px_20px_rgba(0,0,0,0.55)]"
    />
  </motion.div>

  {/* 2. CONNECT 4 BOARD LAYER (ကလေးရှေ့ z-20 တွင် ထောင်နေမည်) */}
  <div className="relative z-20 w-full">
    {/* ဤနေရာတွင် 7x6 ဘုတ်နှင့် Discs များ ထားပါ */}
  </div>

</div>
