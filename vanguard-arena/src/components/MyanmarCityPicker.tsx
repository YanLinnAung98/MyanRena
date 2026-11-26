import React from 'react';
import { Search, MapPin, Check, ChevronDown, X } from 'lucide-react';
import { MYANMAR_REGIONS, getMyanmarTownshipLabel, type MyanmarTownship } from '../data/myanmarTownships.ts';

interface MyanmarCityPickerProps {
  value: string;
  lang: 'my' | 'en';
  onChange: (value: string) => void;
}

export const MyanmarCityPicker: React.FC<MyanmarCityPickerProps> = ({ value, lang, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);
  const selectedLabel = value ? getMyanmarTownshipLabel(value, lang) : '';
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredRegions = React.useMemo(() => MYANMAR_REGIONS.map((region) => ({
    ...region,
    townships: region.townships.filter((township: MyanmarTownship) => !normalizedSearch ||
      [township.en, township.local, township.regionEn, township.regionLocal, township.districtEn || '', township.districtLocal || '']
        .some((part) => part.toLocaleLowerCase().includes(normalizedSearch))),
  })).filter((region) => region.townships.length > 0), [normalizedSearch]);
  const resultCount = filteredRegions.reduce((sum, region) => sum + region.townships.length, 0);

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">{lang === 'my' ? 'မြို့ / မြို့နယ်' : 'City / Township'}</span>
        <span className="text-[9px] text-slate-500">{lang === 'my' ? 'မြို့နယ် ၃၃၀ ခု • တိုင်း/ပြည်နယ် ၁၅ ခု' : '330 townships • 15 states & regions'}</span>
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => { setOpen((current) => !current); setSearch(''); }} aria-expanded={open} aria-haspopup="dialog" aria-label={lang === 'my' ? 'မြို့နယ်ရွေးချယ်ရန်' : 'Choose township'}
          className="flex-1 min-w-0 min-h-10 rounded-lg bg-[#111827] border border-white/10 px-3 py-2 text-xs text-left text-white flex items-center gap-2 hover:border-amber-400/50 focus:outline-none focus:border-amber-400">
          <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className={`flex-1 min-w-0 truncate ${selectedLabel ? 'text-white' : 'text-slate-500'}`}>{selectedLabel || (lang === 'my' ? 'မြို့ / မြို့နယ် ရွေးချယ်ပါ' : 'Choose your city / township')}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {value && <button type="button" onClick={() => onChange('')} aria-label={lang === 'my' ? 'ရွေးချယ်မှုဖျက်မည်' : 'Clear selection'} className="w-10 shrink-0 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>}
      </div>
      {value && !selectedLabel && <p className="text-[10px] text-amber-300/80">{lang === 'my' ? 'အရင်ရွေးထားသော နေရာကို စာရင်းအသစ်တွင် မတွေ့ပါ။ မြို့နယ်အသစ်တစ်ခု ပြန်ရွေးပါ။' : 'Your previous location is no longer in the verified list. Please choose a township again.'}</p>}
      {open && <div role="dialog" aria-label={lang === 'my' ? 'မြို့နယ်စာရင်း' : 'Township list'} className="absolute z-40 top-full left-0 right-0 mt-2 rounded-xl border border-amber-400/25 bg-[#080d17] shadow-2xl overflow-hidden">
        <div className="p-2.5 border-b border-white/10 bg-[#0d1422]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input autoFocus aria-label={lang === 'my' ? 'မြို့နယ်ရှာရန်' : 'Search townships'} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={lang === 'my' ? 'မြို့နာမည် (မြန်မာ / English) ရှာရန်...' : 'Search city or township...'} className="w-full h-9 rounded-lg bg-[#070b14] border border-white/10 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400" />
          </div>
          <div className="mt-1.5 text-[9px] text-slate-500">{lang === 'my' ? `${resultCount} ခု တွေ့ရှိ • မြို့နယ်၊ ခရိုင်၊ တိုင်း/ပြည်နယ်အလိုက် ရှာနိုင်သည်` : `${resultCount} results • Search townships, districts or regions`}</div>
        </div>
        <div className="max-h-64 overflow-y-auto overscroll-contain p-2">
          {filteredRegions.length === 0 ? <p className="py-8 text-center text-xs text-slate-500">{lang === 'my' ? 'မတွေ့ပါ။ စာလုံးပေါင်း ပြန်စစ်ပါ။' : 'No matches. Try another spelling.'}</p> : filteredRegions.map((region) => <div key={region.id} className="mb-2 last:mb-0">
            <div className="sticky top-0 z-10 px-2 py-1.5 rounded-md bg-[#111b2c] text-[10px] font-bold text-amber-300">{lang === 'my' ? region.local : region.en} <span className="font-normal text-slate-500">{lang === 'my' ? region.en : region.local}</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
              {region.townships.map((township) => <button key={township.id} type="button" onClick={() => { onChange(township.id); setOpen(false); setSearch(''); }} className={`min-w-0 flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] transition-colors ${value === township.id ? 'bg-amber-400/15 text-amber-200 border border-amber-400/35' : 'text-slate-200 hover:bg-white/5 border border-transparent'}`}>
                <span className="min-w-0 flex-1 truncate">{lang === 'my' ? township.local : township.en}<span className="ml-1.5 text-[9px] text-slate-500">{lang === 'my' ? township.en : township.local}</span>{(township.districtLocal || township.districtEn) && <span className="block text-[9px] text-slate-500 truncate">{lang === 'my' ? township.districtLocal : township.districtEn}</span>}</span>
                {value === township.id && <Check className="w-3.5 h-3.5 shrink-0 text-amber-300" />}
              </button>)}
            </div>
          </div>)}
        </div>
        <div className="px-3 py-2 border-t border-white/10 text-[9px] text-slate-500">Data: <a href="https://themimu.info/township-profiles" target="_blank" rel="noreferrer" className="text-amber-300/80 hover:text-amber-200 underline">MIMU / GAD township reference</a> · <a href="https://github.com/open-admin-data/myanmar-administrative-divisions" target="_blank" rel="noreferrer" className="text-amber-300/80 hover:text-amber-200 underline">Open Admin Data (CC BY 4.0)</a></div>
      </div>}
    </div>
  );
};
