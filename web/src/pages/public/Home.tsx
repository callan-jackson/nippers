import { Link } from "react-router-dom";
import { ArrowRight, Bus, Car, Clock, Heart, Leaf, Palette, ShieldCheck, Sparkles, Trophy, Users, Utensils, Train } from "lucide-react";
import { useSite } from "@/lib/site";
import { Section, SectionHeading, Feature, Stat, CTA, Testimonials, MapCard, Doodles } from "@/components/marketing";
import { Wave } from "@/components/ui";
import { money } from "@/lib/api";

export default function Home() {
  const { data: site } = useSite();
  const asc = site?.sessions.find((s) => s.club === "afterschool");
  const hcFrom = site ? Math.min(...site.sessions.filter((s) => s.club === "holiday" && s.start !== "07:30").map((s) => s.price)) : undefined;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-cream">
        <Doodles />
        <div className="container-x relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <span className="badge bg-white text-sky-700 shadow-card"><ShieldCheck className="h-3.5 w-3.5" /> Ofsted registered · Charity no. 1087572</span>
            <h1 className="h1 mt-5">
              After school &amp; holiday <span className="text-sky-500">playschemes</span> in Newhaven
            </h1>
            <p className="lead mt-5 max-w-xl">
              <strong className="text-ink-900">N.I.P.P.E.R.S.</strong> — Newhaven Inclusive Play Project Educational and Recreational Services. Friendly, inclusive, technology-free childcare for children aged 3–17, 51 weeks a year, since 1973.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="btn-primary">Book a session <ArrowRight className="h-5 w-5" /></Link>
              <Link to="/holiday-club" className="btn-outline">See holiday club dates</Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-md">
              <Stat value="50+" label="years of play" tone="sky" />
              <Stat value="51" label="weeks a year" tone="leaf" />
              <Stat value="3–17" label="years old" tone="coral" />
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <Tile tone="sky" icon={<Clock className="h-7 w-7" />} title="After School Club" body={`3pm–6pm, term time${asc ? ` · ${money(asc.price)} a session` : ""}`} to="/after-school-club" />
              <Tile tone="sun" icon={<Sparkles className="h-7 w-7" />} title="Holiday Club" body={`7.30am–6pm${hcFrom ? ` · from ${money(hcFrom)}` : ""}`} to="/holiday-club" className="translate-y-6" />
              <Tile tone="leaf" icon={<Leaf className="h-7 w-7" />} title="Forest School" body="Outdoor learning led by trained staff" to="/forest-school" />
              <Tile tone="coral" icon={<Heart className="h-7 w-7" />} title="Inclusive by name" body="Every child, every ability, welcome" to="/about" className="translate-y-6" />
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <Section>
        <SectionHeading eyebrow="Where learning and creativity meet" title="Making time for fun and play" lead="We believe children have enough structure in the school day. At N.I.P.P.E.R.S. they get space to play, create, take healthy risks and build friendships — all in a screen-free setting supported by qualified playworkers." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<Palette className="h-6 w-6" />} title="Arts & crafts" tone="coral">Paint, clay, junk modelling and big messy projects.</Feature>
          <Feature icon={<Trophy className="h-6 w-6" />} title="Sports & outdoor games" tone="sky">Football, rounders, den building and our adventure playground.</Feature>
          <Feature icon={<Leaf className="h-6 w-6" />} title="Forest School" tone="leaf">Fires, tools, bug hunts and mud — led by Forest School trained staff.</Feature>
          <Feature icon={<Utensils className="h-6 w-6" />} title="Cooking & practical skills" tone="sun">Healthy snacks and meals the children help to make.</Feature>
        </div>
      </Section>

      {/* Why families choose us */}
      <section className="bg-sky-500 text-white">
        <Wave fill="#FFFBF4" flip />
        <div className="container-x grid gap-10 py-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="eyebrow text-white/80">Why families choose us</span>
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Safe, qualified, and genuinely inclusive</h2>
            <ul className="mt-6 space-y-4 text-white/90">
              {[
                ["Ofsted registered", "Rated 'Met' — the only grade Ofsted gives to wraparound care."],
                ["Qualified team", "Playwork NVQs, Early Years Level 5, paediatric first aid, safeguarding, SEN and food hygiene trained. All staff hold enhanced DBS checks."],
                ["Run by volunteers", "A registered charity, managed by a committee of volunteers with more than 30 years' experience."],
                ["School collection", "Private transfer from local schools from Telscombe through to Denton for After School Club."],
              ].map(([t, b]) => (
                <li key={t} className="flex gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-sun-300" />
                  <span><strong className="text-white">{t}.</strong> {b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat value="40" label="children & young people" tone="sky" />
            <Stat value="1996" label="first ASC in Newhaven" tone="coral" />
            <Stat value="100%" label="enhanced DBS checked" tone="leaf" />
            <Stat value="0" label="screens — technology free" tone="sun" />
          </div>
        </div>
        <Wave fill="#FFFBF4" />
      </section>

      {/* Testimonials */}
      <Section>
        <SectionHeading eyebrow="What parents say" title="Kind words from our families" center />
        <Testimonials items={site?.testimonials ?? []} />
      </Section>

      {/* Location */}
      <Section className="pt-0">
        <SectionHeading eyebrow="We are here" title="Easy to reach, easy to park" lead="Five minutes' walk from Newhaven Town station and the bus stops on the ring road. Free parking right outside for drop-off and collection." />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <MapCard />
          <div className="grid gap-4">
            <Feature icon={<Train className="h-6 w-6" />} title="By train" tone="sky">Newhaven Town station is a 5-minute walk. Direct trains from Lewes, Brighton and Seaford.</Feature>
            <Feature icon={<Bus className="h-6 w-6" />} title="By bus" tone="leaf">Regular services stop on Newhaven ring road, 5 minutes from the centre.</Feature>
            <Feature icon={<Car className="h-6 w-6" />} title="By car" tone="sun">Free parking outside the centre for drop-off and collection.</Feature>
          </div>
        </div>
      </Section>

      <CTA title="Ready to book?" body="Create a free account, add your children's details once, and book After School Club or Holiday Club sessions in a couple of taps." />
      <div className="container-x pb-8 text-center text-sm text-ink-500">
        <Users className="mb-1 inline h-4 w-4" /> Already have an account? <Link to="/login" className="font-bold text-sky-600">Sign in</Link>
      </div>
    </>
  );
}

function Tile({ tone, icon, title, body, to, className = "" }: { tone: "sky" | "sun" | "leaf" | "coral"; icon: React.ReactNode; title: string; body: string; to: string; className?: string }) {
  const bg = { sky: "bg-sky-500 text-white", sun: "bg-sun-400 text-ink-900", leaf: "bg-leaf-500 text-white", coral: "bg-coral-500 text-white" }[tone];
  const sub = tone === "sun" ? "text-ink-700" : "text-white/80";
  return (
    <Link to={to} className={`group flex min-h-[170px] flex-col justify-between rounded-3xl p-5 shadow-soft transition hover:-translate-y-1 ${bg} ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">{icon}</div>
      <div>
        <h3 className={`font-display text-xl font-semibold ${tone === "sun" ? "text-ink-900" : "text-white"}`}>{title}</h3>
        <p className={`mt-1 text-sm font-semibold ${sub}`}>{body}</p>
      </div>
    </Link>
  );
}
