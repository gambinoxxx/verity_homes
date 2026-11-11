import { getPublishedTestimonials } from "@/lib/db/queries/trust";
import { PillTicker } from "../pill-ticker";
import { TestimonialCarousel } from "./testimonial-carousel";

/** "Clients who trusted Verity": published testimonials with consent. Hidden if there are none. */
export async function Testimonials() {
  const testimonials = await getPublishedTestimonials();
  if (testimonials.length === 0) return null;
  return (
    <section className="sec" aria-labelledby="t-h">
      <div className="container">
        <TestimonialCarousel testimonials={testimonials}>
          <span className="reveal">
            <PillTicker label="Testimonials" />
          </span>
          <h2 className="h2 reveal d1" id="t-h">
            Clients who trusted Verity
          </h2>
        </TestimonialCarousel>
      </div>
    </section>
  );
}
