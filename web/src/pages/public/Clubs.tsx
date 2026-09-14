import { Link } from "react-router-dom";
import { Bus, Clock, Utensils, Leaf, Palette, Trophy, Sparkles, Tent, Compass, Flame, Bug, Axe, TreePine, CalendarDays, ShieldCheck } from "lucide-react";
import { PageHeader, PageLoading } from "@/components/ui";
import { Section, SectionHeading, Feature, CTA } from "@/components/marketing";
import { useSite } from "@/lib/site";
import { fmtDate, money } from "@/lib/api";

export function AfterSchoolClub() {
  const { data: site } = useSite();
  const asc = site?.sessions.filter((s) => s.club === "afterschool") ?? [];
  return (
    <>
      <PageHeader eyebrow="After School Club" title="3pm to 6pm, every school day" lead="Established in September 1996 as the first After School Club in Newhaven. We collect children from local schools and give them a relaxed, non-conservative educational environment to unwind, play and eat well." />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="prose-nippers">
            <span className="eyebrow">How it works</span>
            <h2 className="h2 mb-4 mt-1">Collected, fed and happy</h2>
            <p>Our playworkers collect children by private transfer from schools across the area — from Telscombe through to Denton — and bring them back to the East Side Social Centre for 3pm.</p>
            <p>After a healthy snack there's free choice: arts and crafts, sports and outdoor games in the recreation ground, cooking, Forest School activities, board games, den building or simply time to chat with friends. A hot tea is served before collection at 6pm.</p>
            <p>N.I.P.P.E.R.S. runs term time only, Monday to Friday. Regular and ad-hoc bookings are both welcome — book online with your account.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary">Book After School Club</Link>
              <Link to="/fees" className="btn-outline">See fees</Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feature icon={<Bus className="h-6 w-6" />} title="School collection" tone="sky">Private transfer with our playworkers from schools Telscombe → Denton.</Feature>
            <Feature icon={<Utensils className="h-6 w-6" />} title="Healthy snacks & meals" tone="sun">A snack on arrival and a hot, home-cooked tea. Allergies and diets catered for.</Feature>
            <Feature icon={<Clock className="h-6 w-6" />} title="3pm–6pm" tone="coral">Term time, Monday to Friday. Collect any time up to 6pm.</Feature>
            <Feature icon={<Palette className="h-6 w-6" />} title="Free play" tone="leaf">Crafts, sports, cooking, Forest School — the children choose.</Feature>
          </div>
        </div>
      </Section>
      <section className="bg-white py-12">
        <div className="container-x">
          <SectionHeading eyebrow="Session & price" title="Simple pricing" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {asc.map((s) => (
              <PriceCard key={s.id} label={s.label} time={`${s.start}–${s.end}`} price={s.price} desc={s.description} tone="sky" />
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-500">We accept Tax-Free Childcare, childcare vouchers and bank transfer. See our <Link to="/policies" className="font-bold text-sky-600">booking & cancellation policy</Link>.</p>
        </div>
      </section>
      <CTA title="Need after school care?" body="Create an account, add your child and book the days you need — as regular or as flexible as you like." />
    </>
  );
}

export function HolidayClub() {
  const { data: site } = useSite();
  if (!site) return <PageLoading />;
  const hc = site.sessions.filter((s) => s.club === "holiday");
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = site.calendar.holidayPeriods.filter((h) => h.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <>
      <PageHeader tone="sun" eyebrow="Holiday Club" title="7.30am to 6pm, every school holiday" lead="Open 51 weeks of the year — every half term, Easter, summer and Christmas (closing only for Christmas week). Flexible sessions so you only pay for the hours you need." />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="prose-nippers">
            <span className="eyebrow">What a day looks like</span>
            <h2 className="h2 mb-4 mt-1">Big days out, big days in</h2>
            <p>Holiday Club is where N.I.P.P.E.R.S. started back in 1973 and it's still the highlight of the year for many of our children. Days are packed with sports and exercise, crafts and creative expression, cooking, Forest School, games, excursions, our adventure playground and plenty of imaginative and fantasy play.</p>
            <p>Children have the opportunity to engage with others, take healthy risks with the support of our playworkers and improve their confidence and social skills — all while spending less time on screens.</p>
            <p>We welcome children from Newhaven, Peacehaven, Telscombe, Seaford, Lewes, Brighton, Eastbourne, Polegate and Bexhill. Most important of all: <strong>just have fun!</strong></p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feature icon={<Trophy className="h-6 w-6" />} title="Sports & exercise" tone="sky" />
            <Feature icon={<Palette className="h-6 w-6" />} title="Crafts & creativity" tone="coral" />
            <Feature icon={<Utensils className="h-6 w-6" />} title="Cooking & food" tone="sun" />
            <Feature icon={<Leaf className="h-6 w-6" />} title="Forest School" tone="leaf" />
            <Feature icon={<Compass className="h-6 w-6" />} title="Excursions" tone="sky" />
            <Feature icon={<Tent className="h-6 w-6" />} title="Adventure playground" tone="coral" />
          </div>
        </div>
      </Section>
      <section className="bg-white py-12">
        <div className="container-x">
          <SectionHeading eyebrow="Sessions & prices" title="Pick the hours that suit you" lead="Mix and match sessions across the holidays. Breakfast, lunch and tea are included in the sessions that cover them." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hc.map((s) => (
              <PriceCard key={s.id} label={s.label} time={`${s.start}–${s.end}`} price={s.price} desc={s.description} tone={s.id === "hc-full" ? "coral" : "sun"} />
            ))}
          </div>
        </div>
      </section>
      <Section>
        <SectionHeading eyebrow="Dates" title="Upcoming holiday club dates" lead="Bookings open for all the dates below. Closures for bank holidays and Christmas week are shown in the booking calendar." />
        {upcoming.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((h) => (
              <div key={h.id} className="card flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-100 text-sun-600"><CalendarDays className="h-6 w-6" /></div>
                <div>
                  <div className="font-display font-semibold">{h.label}</div>
                  <div className="text-sm text-ink-500">{fmtDate(h.start, { day: "numeric", month: "short" })} – {fmtDate(h.end, { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ink-500">Dates for the next holidays will be published shortly.</p>
        )}
      </Section>
      <CTA tone="coral" title="Book your holiday sessions" body="Spaces go quickly for summer and half terms — book early to secure your child's place." />
    </>
  );
}

export function ForestSchool() {
  return (
    <>
      <PageHeader tone="leaf" eyebrow="Forest School" title="Mud, fires, tools and wonder" lead="Forest School is a long-term, child-led approach to outdoor learning. Our Forest School trained staff run sessions throughout the year — in all weathers — as part of both After School Club and Holiday Club." />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="prose-nippers">
            <span className="eyebrow">What is Forest School?</span>
            <h2 className="h2 mb-4 mt-1">Learning by doing, outdoors</h2>
            <p>Forest School gives children regular, hands-on time in a natural setting. Rather than following a lesson plan, children choose what they explore — and our trained leaders support them to try things that are new, a little bit challenging, and enormously satisfying.</p>
            <p>Over time children build resilience, confidence, independence and a real connection with the natural world. It's also just brilliant fun: there's nothing quite like toasting marshmallows on a fire you helped to light.</p>
            <p>All Forest School sessions are led by staff holding Forest School certification, with risk assessments in place for every activity. Please send your child with clothes that can get muddy, a waterproof and sturdy shoes or wellies.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feature icon={<Flame className="h-6 w-6" />} title="Fire lighting" tone="coral">Safe fire circles, cooking on the fire and toasting marshmallows.</Feature>
            <Feature icon={<Axe className="h-6 w-6" />} title="Tool use" tone="sun">Whittling, sawing and building with real tools, with close supervision.</Feature>
            <Feature icon={<Bug className="h-6 w-6" />} title="Nature exploration" tone="leaf">Bug hunts, bird spotting, tracking and identifying plants.</Feature>
            <Feature icon={<TreePine className="h-6 w-6" />} title="Den building" tone="sky">Shelters, rope work, knots and teamwork.</Feature>
          </div>
        </div>
      </Section>
      <section className="bg-leaf-100 py-12">
        <div className="container-x grid gap-6 md:grid-cols-3">
          {[
            ["Confidence", "Trying something new and succeeding — or learning from having a go."],
            ["Resilience", "Being outside in all weathers builds grit and a can-do attitude."],
            ["Wellbeing", "Time in nature is proven to reduce stress and improve mood and focus."],
          ].map(([t, b]) => (
            <div key={t} className="card p-6">
              <ShieldCheck className="h-7 w-7 text-leaf-600" />
              <h3 className="h3 mt-3">{t}</h3>
              <p className="mt-2 text-ink-500">{b}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA tone="leaf" title="Forest School is included" body="There's no extra charge — Forest School is part of every After School Club and Holiday Club day." to="/holiday-club" label="See holiday club" />
    </>
  );
}

export function PriceCard({ label, time, price, desc, tone }: { label: string; time: string; price: number; desc?: string; tone: "sky" | "sun" | "coral" }) {
  const ring = { sky: "border-sky-200", sun: "border-sun-300", coral: "border-coral-300 ring-4 ring-coral-100" }[tone];
  return (
    <div className={`card border-2 p-5 ${ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{label}</h3>
          <p className="text-sm font-bold text-ink-500">{time}</p>
        </div>
        <div className="font-display text-3xl font-bold text-ink-900">{money(price)}</div>
      </div>
      {desc && <p className="mt-3 text-sm text-ink-500">{desc}</p>}
      {tone === "coral" && <span className="badge mt-3 bg-coral-100 text-coral-600"><Sparkles className="h-3 w-3" /> Best value</span>}
    </div>
  );
}
