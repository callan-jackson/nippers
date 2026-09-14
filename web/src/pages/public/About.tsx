import { Award, HeartHandshake, ShieldCheck, Smartphone, Users, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Section, SectionHeading, Feature, CTA } from "@/components/marketing";

export default function About() {
  return (
    <>
      <PageHeader eyebrow="About us" title="Play, create and grow — since 1973" lead="N.I.P.P.E.R.S. is a registered charity run by a volunteer management committee, caring for children and young people aged 3–17 across Newhaven, the Havens and surrounding areas." />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="prose-nippers">
            <span className="eyebrow">Our story</span>
            <h2 className="h2 mb-4 mt-1">From a two-week playscheme to 51 weeks a year</h2>
            <p>The Newhaven Summer Playscheme first opened its doors in 1973, running for two weeks each summer. In September 1996 — with funding from Sussex Enterprise, OSCI and the Out of School Initiative, and later the New Opportunities Lottery Fund — we established the very first After School Club in Newhaven.</p>
            <p>More than 30 years on, N.I.P.P.E.R.S. now runs an After School Club and a Holiday Club for around 40 children and young people, 51 weeks of the year, from our home at the East Side Social Centre. We've cared for hundreds of local families along the way.</p>
            <p>We were the first setting in the Lewes District to achieve the Level 2 Aiming High accreditation for quality assurance, and we've maintained those standards ever since.</p>
          </div>
          <div className="prose-nippers">
            <span className="eyebrow">Our ethos</span>
            <h2 className="h2 mb-4 mt-1">A technology-free setting where children can just be children</h2>
            <p>We are a technology-free setting. Children spend enough of their day in front of screens and in structured lessons — we think the hours after school and in the holidays should be different.</p>
            <p>N.I.P.P.E.R.S. offers a friendly, fun and safe, yet challenging environment for play and creative development. Our playworkers support children to play freely, take healthy risks, make things, get muddy and, above all, develop their confidence and social skills with others.</p>
            <p>Inclusion is in our name. Children of all abilities and backgrounds are welcome, and we adapt what we do so that every child can join in.</p>
          </div>
        </div>
      </Section>

      <section className="bg-white py-12 sm:py-16">
        <div className="container-x">
          <SectionHeading eyebrow="Our team" title="Qualified, checked and trained" lead="Every member of staff holds — or is training for — a Playwork NVQ. The whole team also completes:" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<ShieldCheck className="h-6 w-6" />} title="Enhanced DBS checks" tone="sky">Plus full suitability checks for every member of staff and volunteer.</Feature>
            <Feature icon={<GraduationCap className="h-6 w-6" />} title="Early Years Level 5" tone="sun">Early Years qualified staff lead our provision for our youngest children.</Feature>
            <Feature icon={<HeartHandshake className="h-6 w-6" />} title="Paediatric first aid" tone="coral">Paediatric first aid certificates, renewed every three years.</Feature>
            <Feature icon={<ShieldCheck className="h-6 w-6" />} title="Safeguarding" tone="leaf">Safeguarding and child protection training, refreshed regularly.</Feature>
            <Feature icon={<Users className="h-6 w-6" />} title="Special Educational Needs" tone="sky">SEN training so every child gets the support they need.</Feature>
            <Feature icon={<Award className="h-6 w-6" />} title="Food hygiene & Forest School" tone="sun">Level 2 Food Hygiene for our cooks and Forest School certification for our outdoor leaders.</Feature>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="card p-6">
            <Users className="h-8 w-8 text-sky-500" />
            <h3 className="h3 mt-3">Run by volunteers</h3>
            <p className="mt-2 text-ink-500">We're a registered charity (no. 1087572) governed by a volunteer management committee of local parents and community members. Interested in joining? We'd love to hear from you.</p>
          </div>
          <div className="card p-6">
            <ShieldCheck className="h-8 w-8 text-leaf-500" />
            <h3 className="h3 mt-3">Ofsted: Met</h3>
            <p className="mt-2 text-ink-500">We are registered with Ofsted and hold the "Met" judgement — the only grade Ofsted awards to wraparound childcare on the Childcare Register.</p>
          </div>
          <div className="card p-6">
            <Smartphone className="h-8 w-8 text-coral-500" />
            <h3 className="h3 mt-3">Technology-free</h3>
            <p className="mt-2 text-ink-500">No tablets, no consoles, no screens. Just play, friends, fresh air and the odd bit of glitter.</p>
          </div>
        </div>
      </Section>

      <CTA title="Come and see us" body="We're always happy to show families around. Get in touch to arrange a visit or ask a question." to="/contact" label="Contact us" tone="leaf" />
    </>
  );
}
