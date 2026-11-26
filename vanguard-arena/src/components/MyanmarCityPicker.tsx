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
  const selectedLabel = value ? getMyanmarTownshipLabel(value, lang) : '';
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredRegions = React.useMemo(() => MYANMAR_REGIONS.map((region) => ({
    ...region,
    cities: region.cities.filter((city: MyanmarTownship) => !normalizedSearch ||
      [city.en, city.local, city.regionEn, city.regionLocal].some((part) => part.toLocaleLowerCase().includes(normalizedSearch))),
  })).filter((region) => region.cities.length > 0), [normalizedSearch]);
  const resultCount = filteredRegions.reduce((sum, region) => sum + region.cities.length, 0);

  return (
    <div className="relative space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">{lang === 'my' ? 'မြို့ / မြို့နယ်' : 'City / Township'}</span>
        <span className="text-[9px] text-slate-500">{lang === 'my' ? 'တိုင်း/ပြည်နယ် ၁၅ ခု' : '15 states & regions'}</span>
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => { setOpen((current) => !current); setSearch(''); }} aria-expanded={open}
          className="flex-1 min-w-0 min-h-10 rounded-lg bg-[#111827] border border-white/10 px-3 py-2 text-xs text-left text-white flex items-center gap-2 hover:border-amber-400/50 focus:outline-none focus:border-amber-400">
          <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className={`flex-1 min-w-0 truncate ${selectedLabel ? 'text-white' : 'text-slate-500'}`}>{selectedLabel || (lang === 'my' ? 'မြို့ / မြို့နယ် ရွေးချယ်ပါ' : 'Choose your city / township')}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {value && <button type="button" onClick={() => onChange('')} aria-label={lang === 'my' ? 'ရွေးချယ်မှုဖျက်မည်' : 'Clear selection'} className="w-10 shrink-0 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>}
      </div>
      {open && <div className="absolute z-40 top-full left-0 right-0 mt-2 rounded-xl border border-amber-400/25 bg-[#080d17] shadow-2xl overflow-hidden">
        <div className="p-2.5 border-b border-white/10 bg-[#0d1422]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={lang === 'my' ? 'မြို့နာမည် (မြန်မာ / English) ရှာရန်...' : 'Search city or township...'} className="w-full h-9 rounded-lg bg-[#070b14] border border-white/10 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400" />
          </div>
          <div className="mt-1.5 text-[9px] text-slate-500">{lang === 'my' ? `${resultCount} ခု တွေ့ရှိ • အမည်နှင့် တိုင်း/ပြည်နယ်အလိုက် ရှာနိုင်သည်` : `${resultCount} results • Search in English or Myanmar`}</div>
        </div>
        <div className="max-h-64 overflow-y-auto overscroll-contain p-2">
          {filteredRegions.length === 0 ? <p className="py-8 text-center text-xs text-slate-500">{lang === 'my' ? 'မတွေ့ပါ။ စာလုံးပေါင်း ပြန်စစ်ပါ။' : 'No matches. Try another spelling.'}</p> : filteredRegions.map((region) => <div key={region.id} className="mb-2 last:mb-0">
            <div className="sticky top-0 z-10 px-2 py-1.5 rounded-md bg-[#111b2c] text-[10px] font-bold text-amber-300">{lang === 'my' ? region.local : region.en} <span className="font-normal text-slate-500">{lang === 'my' ? region.en : region.local}</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
              {region.cities.map((city) => <button key={city.id} type="button" onClick={() => { onChange(city.id); setOpen(false); setSearch(''); }} className={`min-w-0 flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] transition-colors ${value === city.id ? 'bg-amber-400/15 text-amber-200 border border-amber-400/35' : 'text-slate-200 hover:bg-white/5 border border-transparent'}`}>
                <span className="min-w-0 flex-1 truncate">{lang === 'my' ? city.local : city.en}<span className="ml-1.5 text-[9px] text-slate-500">{lang === 'my' ? city.en : city.local}</span></span>
                {value === city.id && <Check className="w-3.5 h-3.5 shrink-0 text-amber-300" />}
              </button>)}
            </div>
          </div>)}
        </div>
      </div>}
    </div>
  );
};
