import { getPublishedTestimonials } from "@/lib/db/queries/trust";
import { MarqueeEyebrow } from "../marquee-eyebrow";
import { Reveal } from "../reveal";
import { TestimonialCarousel } from "./testimonial-carousel";

/** "Clients who trusted Verity": published testimonials with consent. Hidden if there are none. */
export async function Testimonials() {
  const testimonials = await getPublishedTestimonials();
  if (testimonials.length === 0) return null;
  return (
    <section className="sec" aria-labelledby="t-h">
      <div className="container">
        <TestimonialCarousel testimonials={testimonials}>
          <Reveal as="span">
            <MarqueeEyebrow label="Testimonials" />
          </Reveal>
          <Reveal as="h2" className="h2" delay={1} id="t-h">
            Clients who trusted Verity
          </Reveal>
        </TestimonialCarousel>
      </div>
    </section>
  );
}
