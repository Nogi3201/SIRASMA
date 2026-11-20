import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUp, BedDouble, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, ExternalLink, FileText, KeyRound, MapPin, Menu, Pause, Play, ShieldCheck, Smartphone, UsersRound, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/Logo.js';
import { cx } from '../components/ui.js';

const navigation = [{ label: 'Beranda', id: 'beranda' }, { label: 'Kampus & Asrama', id: 'asrama' }, { label: 'Fasilitas', id: 'fasilitas' }, { label: 'Tentang Kami', id: 'tentang' }];
const features = [
  { icon: BedDouble, title: 'Data kamar terkelola', detail: 'Informasi gedung dan kamar bersumber dari data resmi pengelola asrama.' },
  { icon: ClipboardCheck, title: 'Status pengajuan jelas', detail: 'Pantau tahapan verifikasi dan persetujuan secara terpusat.' },
  { icon: FileText, title: 'Dokumen lebih tertata', detail: 'Kelengkapan dokumen menjadi bagian dari alur pengajuan.' },
  { icon: KeyRound, title: 'Akses sesuai peran', detail: 'Mahasiswa, Staff, dan Admin memiliki dashboard dan hak akses masing-masing.' },
  { icon: ShieldCheck, title: 'Keamanan akun', detail: 'Sesi dilindungi token dan proteksi CSRF untuk menjaga data tetap aman.' },
  { icon: Smartphone, title: 'Nyaman di semua perangkat', detail: 'Tampilan responsif, dari ponsel hingga layar desktop.' },
];
const steps = [{ icon: UsersRound, title: 'Registrasi mahasiswa', detail: 'Buat akun menggunakan data kampus Anda.' }, { icon: FileText, title: 'Lengkapi profil', detail: 'Siapkan data dan dokumen yang diperlukan.' }, { icon: CalendarCheck, title: 'Ajukan reservasi', detail: 'Pilih kamar saat periode dibuka.' }, { icon: CheckCircle2, title: 'Pantau pengajuan', detail: 'Lihat perkembangan melalui dashboard.' }];
const heroSlides = [
  { src: '/images/ulbi/hero-1.jpg', eyebrow: 'Sistem Reservasi Asrama · ULBI Bandung', title: 'Hunian mahasiswa, tertata sejak pengajuan pertama.', copy: 'SIRASMA membantu mahasiswa Universitas Logistik & Bisnis Internasional menyiapkan pengajuan, melengkapi data, dan memantau status dalam satu alur yang jelas.', label: 'Pengajuan yang terarah' },
  { src: '/images/ulbi/hero-2.jpg', eyebrow: 'Kampus Sarijadi · Kota Bandung', title: 'Kenali lingkungan kampus dan hunian dengan lebih mudah.', copy: 'Informasi gedung, kamar, dan periode reservasi hadir ketika dipublikasikan oleh pengelola asrama.', label: 'Informasi terverifikasi' },
  { src: '/images/ulbi/hero-3.jpg', eyebrow: 'Satu pengalaman terintegrasi', title: 'Dari pendaftaran hingga pemantauan, semua dalam satu tempat.', copy: 'Siapkan akun SIRASMA sebelum periode reservasi dibuka dan lanjutkan proses dari dashboard Anda.', label: 'Siap digunakan mahasiswa' },
];
const gallery = [
  { src: '/images/ulbi/galeri-1.jpg', caption: 'Gedung utama kampus ULBI', className: 'sm:col-span-2 sm:row-span-2' },
  { src: '/images/ulbi/galeri-2.jpg', caption: 'Area kampus Sarijadi', className: '' },
  { src: '/images/ulbi/galeri-3.jpg', caption: 'Lingkungan belajar', className: '' },
  { src: '/images/ulbi/galeri-4.jpg', caption: 'Hunian & fasilitas mahasiswa', className: 'sm:col-span-2' },
];
const MAP_SRC = 'https://www.google.com/maps?q=Universitas+Logistik+dan+Bisnis+Internasional+Bandung&output=embed';
const MAP_LINK = 'https://www.google.com/maps/search/?api=1&query=Universitas+Logistik+dan+Bisnis+Internasional+Bandung';

/** Illustrated campus used until real photos are placed in /public/images/ulbi. */
const CampusArt: React.FC<{ className?: string; variant?: number }> = ({ className, variant = 0 }) => {
  const id = `sky-${variant}`;
  const tints = [['#dbe5f8', '#b9ccf0'], ['#ffe3d3', '#dbe5f8'], ['#eef3fc', '#b9ccf0'], ['#dbe5f8', '#ffe3d3']][variant % 4];
  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={tints[0]} /><stop offset="1" stopColor={tints[1]} /></linearGradient></defs>
      <rect width="800" height="500" fill={`url(#${id})`} />
      <circle cx="610" cy="120" r="46" fill="#f15a24" opacity=".9" />
      <g className="animate-drift" fill="#fff" opacity=".85"><ellipse cx="160" cy="90" rx="70" ry="18" /><ellipse cx="210" cy="78" rx="44" ry="16" /><ellipse cx="470" cy="150" rx="60" ry="14" /></g>
      <rect x="0" y="400" width="800" height="100" fill="#2d4f9c" opacity=".25" />
      <g fill="#203b78"><rect x="120" y="190" width="170" height="230" rx="6" /><rect x="310" y="130" width="190" height="290" rx="6" /><rect x="520" y="210" width="160" height="210" rx="6" /></g>
      <rect x="300" y="120" width="210" height="14" rx="4" fill="#17243a" />
      <g fill="#ffd9c6">{[0, 1, 2, 3, 4].flatMap((r) => [0, 1, 2, 3].map((c) => <rect key={`b${r}${c}`} x={330 + c * 40} y={155 + r * 46} width="22" height="28" rx="3" opacity={(r + c + variant) % 3 === 0 ? 1 : 0.45} />))}</g>
      <g fill="#b9ccf0">{[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => <rect key={`a${r}${c}`} x={140 + c * 48} y={215 + r * 48} width="26" height="30" rx="3" opacity=".8" />))}{[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => <rect key={`c${r}${c}`} x={538 + c * 44} y={232 + r * 44} width="24" height="28" rx="3" opacity=".8" />))}</g>
      <rect x="378" y="360" width="54" height="60" rx="4" fill="#f15a24" />
      <g fill="#3f64b5"><circle cx="70" cy="395" r="34" /><circle cx="740" cy="392" r="38" /><circle cx="700" cy="410" r="26" /></g>
      <g fill="#17243a" opacity=".5"><rect x="66" y="410" width="8" height="30" /><rect x="736" y="410" width="8" height="30" /></g>
    </svg>
  );
};

const PhotoSlot: React.FC<{ src: string; alt: string; className?: string; variant?: number; children?: React.ReactNode }> = ({ src, alt, className, variant = 0, children }) => {
  const [ok, setOk] = useState(true);
  return (
    <div className={cx('relative overflow-hidden', className)}>
      <CampusArt className="absolute inset-0 size-full" variant={variant} />
      {ok && <img src={src} alt={alt} loading="lazy" onError={() => setOk(false)} className="absolute inset-0 size-full object-cover" />}
      {children}
    </div>
  );
};

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; x?: number }> = ({ children, delay = 0, className, x = 0 }) => {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={{ opacity: 0, y: reduced ? 0 : 28, x: reduced ? 0 : x }} whileInView={{ opacity: 1, y: 0, x: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
};

const Eyebrow: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => <p className={cx('inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[.16em]', light ? 'text-orange-200' : 'text-accent-500')}><span className="h-0.5 w-6 rounded-full bg-current" />{children}</p>;

const SLIDE_MS = 6000;

export const LandingPage: React.FC = () => {
  const reduced = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('beranda');
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const parallax = useTransform(heroScroll, [0, 1], ['0%', reduced ? '0%' : '18%']);
  const next = useCallback(() => setSlide((v) => (v + 1) % heroSlides.length), []);
  const previous = () => setSlide((v) => (v - 1 + heroSlides.length) % heroSlides.length);
  const scrollTo = (id: string) => { setMenuOpen(false); setActive(id); document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    const observer = new IntersectionObserver((entries) => { const t = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (t) setActive(t.target.id); }, { rootMargin: '-18% 0px -58% 0px', threshold: [0.15, 0.4, 0.65] });
    navigation.forEach(({ id }) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);
  useEffect(() => { if (paused || reduced) return; const timer = window.setTimeout(next, SLIDE_MS); return () => window.clearTimeout(timer); }, [slide, paused, reduced, next]);
  const current = heroSlides[slide];

  return <div className="min-h-screen bg-white font-sans text-ink selection:bg-orange-100 selection:text-brand-700">
    <motion.div className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent-500" style={{ scaleX: progress }} />

    <header className={cx('fixed inset-x-0 top-0 z-50 border-b transition-all duration-300', scrolled ? 'border-line bg-white/90 shadow-card backdrop-blur-lg' : 'border-transparent bg-white/80 backdrop-blur')}>
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="Navigasi utama">
        <button type="button" onClick={() => scrollTo('beranda')} className="flex cursor-pointer items-center gap-3 text-left"><LogoMark className="size-10" /><span><span className="block text-lg font-extrabold leading-none tracking-tight text-brand-700">SIRASMA</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[.16em] text-accent-500">Reservasi Asrama · ULBI</span></span></button>
        <div className="hidden h-full items-center gap-7 lg:flex">{navigation.map((item) => <button key={item.id} type="button" onClick={() => scrollTo(item.id)} className={cx('relative h-full cursor-pointer text-sm font-semibold transition', active === item.id ? 'text-brand-700' : 'text-muted hover:text-brand-700')}>{item.label}{active === item.id && <motion.span layoutId="active-nav" className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-accent-500" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}</button>)}</div>
        <div className="hidden items-center gap-2 sm:flex"><Link to="/login" className="rounded-xl px-4 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-50">Masuk</Link><Link to="/register" className="rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-pop">Daftar</Link></div>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="grid size-10 place-items-center text-brand-700 sm:hidden" aria-expanded={menuOpen} aria-label="Menu">{menuOpen ? <X /> : <Menu />}</button>
      </nav>
      <motion.div initial={false} animate={{ height: menuOpen ? 'auto' : 0, opacity: menuOpen ? 1 : 0 }} className="overflow-hidden border-t border-line bg-white sm:hidden"><div className="space-y-1 px-5 py-4">{navigation.map((item) => <button key={item.id} onClick={() => scrollTo(item.id)} className={cx('w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold', active === item.id ? 'bg-accent-50 text-brand-700' : 'text-muted')}>{item.label}</button>)}<div className="grid grid-cols-2 gap-3 pt-3"><Link to="/login" className="rounded-xl border border-line py-2.5 text-center text-sm font-bold text-brand-700">Masuk</Link><Link to="/register" className="rounded-xl bg-accent-500 py-2.5 text-center text-sm font-bold text-white">Daftar</Link></div></div></motion.div>
    </header>

    <main>
      {/* ── HERO SLIDESHOW ── */}
      <section id="beranda" className="scroll-mt-20 pt-20">
        <div ref={heroRef} className="relative isolate min-h-[640px] overflow-hidden bg-brand-900 lg:min-h-[calc(100svh-5rem)]" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onKeyDown={(e) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') previous(); }} tabIndex={0} aria-roledescription="carousel" aria-label="Sorotan SIRASMA">
          <motion.div style={{ y: parallax }} className="absolute inset-0 -top-10 -bottom-10">
            <AnimatePresence mode="sync">
              <motion.div key={slide} initial={{ opacity: 0, scale: reduced ? 1 : 1.12 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ opacity: { duration: reduced ? 0 : 1.1 }, scale: { duration: reduced ? 0 : SLIDE_MS / 1000 + 1.5, ease: 'easeOut' } }} className="absolute inset-0">
                <PhotoSlot src={current.src} alt={current.eyebrow} variant={slide} className="size-full" />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900/95 via-brand-800/75 to-brand-900/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/70 via-transparent to-transparent" />
          <div className="animate-float pointer-events-none absolute -right-24 top-24 size-96 rounded-full bg-accent-500/30 blur-3xl" />

          <div className="relative mx-auto grid min-h-[640px] max-w-7xl items-center gap-10 px-5 py-24 sm:px-8 lg:min-h-[calc(100svh-5rem)] lg:grid-cols-[1.25fr_.75fr] lg:px-10">
            <AnimatePresence mode="wait">
              <motion.div key={slide} initial="hidden" animate="show" exit={{ opacity: 0, y: -14, transition: { duration: 0.25 } }} variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : 0.12 } } }} className="max-w-2xl text-white">
                {[
                  <p key="e" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-orange-100 ring-1 ring-white/20 backdrop-blur"><MapPin className="size-3.5" />{current.eyebrow}</p>,
                  <h1 key="t" className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"><span className="text-shine">{current.title}</span></h1>,
                  <p key="c" className="mt-6 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">{current.copy}</p>,
                  <div key="b" className="mt-9 flex flex-col gap-3 sm:flex-row"><motion.button whileHover={reduced ? undefined : { y: -3 }} whileTap={{ scale: 0.97 }} onClick={() => scrollTo('asrama')} className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3.5 text-sm font-bold shadow-lg shadow-accent-500/30 transition hover:bg-accent-600">Jelajahi Kampus <ArrowRight className="size-4 transition group-hover:translate-x-1" /></motion.button><Link to="/login" className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/5 px-6 py-3.5 text-sm font-bold backdrop-blur transition hover:bg-white/15">Masuk ke akun</Link></div>,
                ].map((node, i) => <motion.div key={i} variants={{ hidden: { opacity: 0, y: reduced ? 0 : 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } }}>{node}</motion.div>)}
              </motion.div>
            </AnimatePresence>

            <motion.aside initial={{ opacity: 0, x: reduced ? 0 : 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.7 }} className="animate-float hidden rounded-3xl border border-white/20 bg-white/10 p-6 text-white shadow-pop backdrop-blur-xl lg:block" aria-label="Alur singkat">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-100">Alur reservasi</p>
              <ul className="mt-5 space-y-4">{['Registrasi akun mahasiswa', 'Verifikasi data akademik', 'Pilih kamar & ajukan', 'Persetujuan & alokasi kamar'].map((t, i) => <motion.li key={t} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.18 }} className="flex items-center gap-3 text-sm font-semibold"><span className="grid size-8 place-items-center rounded-full bg-accent-500 text-xs font-extrabold">{i + 1}</span>{t}</motion.li>)}</ul>
              <Link to="/register" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-brand-700 transition hover:bg-orange-50">Mulai sekarang <ArrowRight className="size-4" /></Link>
            </motion.aside>
          </div>

          <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl items-center justify-between px-5 pb-7 sm:px-8 lg:px-10">
            <div className="flex items-center gap-2">{heroSlides.map((_, i) => <button key={i} type="button" onClick={() => setSlide(i)} className="group cursor-pointer p-1" aria-label={`Tampilkan slide ${i + 1}`} aria-current={slide === i}><span className={cx('relative block h-1.5 overflow-hidden rounded-full bg-white/40 transition-all', slide === i ? 'w-14' : 'w-4 group-hover:bg-white/70')}>{slide === i && <motion.span key={`${slide}-${paused}`} initial={{ width: reduced || paused ? '100%' : '0%' }} animate={{ width: '100%' }} transition={{ duration: reduced || paused ? 0 : SLIDE_MS / 1000, ease: 'linear' }} className="absolute inset-y-0 left-0 rounded-full bg-accent-500" />}</span></button>)}</div>
            <div className="flex items-center gap-3 text-sm font-bold text-white"><span className="hidden sm:inline">{String(slide + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}</span>{[[paused ? 'Lanjutkan slideshow' : 'Jeda slideshow', () => setPaused(!paused), paused ? Play : Pause], ['Slide sebelumnya', previous, ChevronLeft], ['Slide berikutnya', next, ChevronRight]].map(([label, fn, Icon], i) => { const I = Icon as React.ElementType; return <button key={i} type="button" onClick={fn as () => void} className="grid size-10 cursor-pointer place-items-center rounded-full border border-white/30 bg-white/5 backdrop-blur transition hover:bg-white/20" aria-label={label as string}><I className="size-4" /></button>; })}</div>
          </div>
        </div>
      </section>

      {/* ── FEATURE STRIP ── */}
      <section className="relative z-10 -mt-12 px-5 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">{features.slice(0, 3).map((item, i) => { const Icon = item.icon; return <Reveal key={item.title} delay={i * 0.1}><div className="flex h-full items-start gap-4 rounded-2xl border border-line bg-white p-6 shadow-pop transition hover:-translate-y-1"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="size-6" /></span><div><h3 className="font-bold text-ink">{item.title}</h3><p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p></div></div></Reveal>; })}</div></section>

      {/* ── CAMPUS GALLERY ── */}
      <section id="asrama" className="scroll-mt-24 py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Reveal className="max-w-2xl"><Eyebrow>Kampus & Asrama</Eyebrow><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-700 sm:text-4xl">Lingkungan belajar dan hunian ULBI Bandung.</h2><p className="mt-4 leading-7 text-muted">Kenali suasana kampus Universitas Logistik & Bisnis Internasional. Data gedung, kamar, dan ketersediaan ditampilkan dari sistem setelah Anda masuk.</p></Reveal>
        <div className="mt-10 grid auto-rows-[190px] gap-4 sm:grid-cols-4 sm:auto-rows-[200px]">
          {gallery.map((g, i) => (
            <Reveal key={g.src} delay={i * 0.08} className={cx('group', g.className)}>
              <PhotoSlot src={g.src} alt={g.caption} variant={i} className="size-full rounded-3xl shadow-card transition duration-500 group-hover:shadow-pop">
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/75 via-transparent to-transparent opacity-80 transition group-hover:opacity-100" />
                <p className="absolute bottom-4 left-5 right-5 translate-y-1 text-sm font-bold text-white transition group-hover:translate-y-0">{g.caption}</p>
              </PhotoSlot>
            </Reveal>
          ))}
        </div>
      </div></section>

      {/* ── FACILITIES ── */}
      <section id="fasilitas" className="scroll-mt-24 border-y border-line bg-canvas py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Reveal className="max-w-2xl"><Eyebrow>Fasilitas sistem</Eyebrow><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-700 sm:text-4xl">Proses yang mudah dipahami.</h2></Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{features.map((item, i) => { const Icon = item.icon; return <Reveal key={item.title} delay={(i % 3) * 0.09}><div className="group h-full rounded-2xl border border-line bg-white p-7 shadow-card transition duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-pop"><span className="grid size-12 place-items-center rounded-full bg-accent-50 text-accent-500 transition duration-300 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-accent-500 group-hover:text-white"><Icon className="size-6" /></span><h3 className="mt-5 text-lg font-bold text-brand-700">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p></div></Reveal>; })}</div>
      </div></section>

      {/* ── STEPS ── */}
      <section className="py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Reveal className="max-w-2xl"><Eyebrow>Alur reservasi</Eyebrow><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-700 sm:text-4xl">Empat langkah menuju pengajuan.</h2></Reveal>
        <div className="relative mt-12"><motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: reduced ? 0 : 1.2, ease: 'easeOut' }} className="absolute left-0 right-0 top-7 hidden h-0.5 origin-left bg-gradient-to-r from-brand-700 via-brand-500 to-accent-500 lg:block" />
          <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{steps.map((item, i) => { const Icon = item.icon; return <Reveal key={item.title} delay={i * 0.12}><div className="group"><span className="relative grid size-14 place-items-center rounded-2xl bg-brand-700 text-white shadow-lg shadow-brand-700/25 ring-4 ring-white transition duration-300 group-hover:-translate-y-1 group-hover:bg-accent-500"><Icon className="size-6" /><span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-accent-500 text-[11px] font-extrabold ring-2 ring-white transition group-hover:bg-brand-700">{i + 1}</span></span><h3 className="mt-5 font-bold text-ink">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p></div></Reveal>; })}</div></div>
      </div></section>

      {/* ── ABOUT + MAP ── */}
      <section id="tentang" className="scroll-mt-24 bg-gradient-to-br from-brand-700 to-brand-900 py-20 text-white sm:py-28"><div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:px-10">
        <Reveal><Eyebrow light>Tentang SIRASMA</Eyebrow><h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Sistem reservasi untuk pengalaman hunian kampus yang lebih jelas.</h2><p className="mt-5 max-w-xl leading-7 text-slate-200">SIRASMA mendukung pengajuan asrama mahasiswa ULBI melalui informasi, verifikasi, dan status yang tersusun dalam satu sistem.</p>
          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-500"><MapPin className="size-5" /></span><div><p className="text-sm font-bold uppercase tracking-[.12em] text-orange-200">Universitas Logistik & Bisnis Internasional</p><p className="mt-1 text-sm leading-6 text-slate-200">Jalan Sariasih No. 54, Sarijadi, Kota Bandung, Jawa Barat 40151.</p><a href={MAP_LINK} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-white underline-offset-4 hover:underline">Buka di Google Maps <ExternalLink className="size-3.5" /></a></div></div></Reveal>
        <Reveal delay={0.12} x={30}><div className="overflow-hidden rounded-3xl border border-white/20 bg-white shadow-pop"><iframe title="Peta lokasi ULBI Bandung" src={MAP_SRC} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-80 w-full border-0 sm:h-96" /></div></Reveal>
      </div></section>

      {/* ── CTA ── */}
      <Reveal className="px-5 py-16 sm:px-8 lg:px-10"><div className="relative mx-auto flex max-w-7xl flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-line bg-canvas px-7 py-12 shadow-card sm:px-12 lg:flex-row lg:items-center"><div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-accent-500/15 blur-2xl" /><div className="relative"><Eyebrow>Mulai pengajuan Anda</Eyebrow><h2 className="mt-3 max-w-xl text-2xl font-extrabold tracking-tight text-brand-700 sm:text-3xl">Siapkan akun SIRASMA sebelum periode reservasi dibuka.</h2></div><div className="relative flex gap-3"><Link to="/login" className="rounded-xl border border-brand-700 px-6 py-3 text-sm font-bold text-brand-700 transition hover:bg-white">Masuk</Link><Link to="/register" className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-pop">Daftar sekarang</Link></div></div></Reveal>
    </main>

    <footer className="border-t border-line bg-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 py-10 sm:px-8 md:flex-row lg:px-10"><div className="flex items-center gap-3"><LogoMark className="size-10" /><div><p className="font-extrabold text-brand-700">SIRASMA</p><p className="mt-0.5 text-xs font-bold uppercase tracking-[.14em] text-accent-500">Sistem Reservasi Asrama · ULBI</p></div></div><div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-muted">{navigation.map((item) => <button key={item.id} onClick={() => scrollTo(item.id)} className="cursor-pointer transition hover:text-brand-700">{item.label}</button>)}<Link to="/login" className="transition hover:text-brand-700">Masuk</Link></div></div><p className="border-t border-line py-4 text-center text-xs text-muted">&copy; {new Date().getFullYear()} SIRASMA · Universitas Logistik & Bisnis Internasional, Bandung.</p></footer>

    <AnimatePresence>{scrolled && <motion.button initial={{ opacity: 0, y: 12, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.8 }} whileHover={{ y: -3 }} onClick={() => scrollTo('beranda')} className="fixed bottom-6 right-6 z-40 grid size-12 cursor-pointer place-items-center rounded-full bg-brand-700 text-white shadow-pop hover:bg-brand-800" aria-label="Kembali ke atas"><ArrowUp className="size-5" /></motion.button>}</AnimatePresence>
  </div>;
};
