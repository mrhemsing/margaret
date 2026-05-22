"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Testimonial = {
  quote: string;
  name: string;
  location: string;
};

export function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(1);
  const pageCount = useMemo(() => Math.ceil(testimonials.length / itemsPerPage), [itemsPerPage, testimonials.length]);
  const activePage = Math.min(Math.floor(activeIndex / itemsPerPage), pageCount - 1);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");

    function updateItemsPerPage() {
      setItemsPerPage(mediaQuery.matches ? 2 : 1);
    }

    updateItemsPerPage();
    mediaQuery.addEventListener("change", updateItemsPerPage);

    return () => mediaQuery.removeEventListener("change", updateItemsPerPage);
  }, []);

  function scrollToIndex(index: number) {
    const scroller = scrollerRef.current;
    const card = scroller?.children.item(index) as HTMLElement | null;

    if (!scroller || !card) return;

    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setActiveIndex(index);
  }

  function scrollByCard(direction: "prev" | "next") {
    const pageIndex = direction === "next"
      ? Math.min(activePage + 1, pageCount - 1)
      : Math.max(activePage - 1, 0);
    const nextIndex = pageIndex * itemsPerPage;

    scrollToIndex(nextIndex);
  }

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(scroller.children) as HTMLElement[];
    const scrollerCenter = scroller.scrollLeft + scroller.clientWidth / 2;
    const closest = cards.reduce(
      (best, card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(cardCenter - scrollerCenter);
        return distance < best.distance ? { index, distance } : best;
      },
      { index: 0, distance: Number.POSITIVE_INFINITY },
    );

    setActiveIndex(closest.index);
  }

  return (
    <div className="relative mt-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-12 bg-gradient-to-r from-white/70 to-transparent md:block" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-12 bg-gradient-to-l from-white/70 to-transparent md:block" />

      <button
        type="button"
        aria-label="Previous testimonial"
        onClick={() => scrollByCard("prev")}
        className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl font-bold text-ink shadow-sm ring-1 ring-black/10 transition hover:bg-white hover:shadow-md disabled:opacity-40 md:flex"
        disabled={activePage === 0}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        onClick={() => scrollByCard("next")}
        className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl font-bold text-ink shadow-sm ring-1 ring-black/10 transition hover:bg-white hover:shadow-md disabled:opacity-40 md:flex"
        disabled={activePage === pageCount - 1}
      >
        ›
      </button>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x gap-4 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-5 md:px-12 md:pb-3 [&::-webkit-scrollbar]:hidden"
      >
        {testimonials.map((testimonial) => (
          <blockquote key={testimonial.quote} className="relative flex min-w-[82%] snap-center flex-col overflow-hidden rounded-[2rem] bg-white/90 p-5 shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-md md:w-[calc((100%_-_1.25rem)/2)] md:min-w-[calc((100%_-_1.25rem)/2)] md:flex-none md:snap-start">
            <div className="relative flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brandBlue/10 text-xl font-bold text-brandButtonBlue ring-1 ring-brandBlue/20">
                {testimonial.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-ink">{testimonial.name}</p>
                <p className="text-sm font-semibold text-sage">{testimonial.location}</p>
              </div>
            </div>
            <p className="relative mt-5 grow text-lg font-bold leading-8 text-ink">&quot;{testimonial.quote}&quot;</p>
          </blockquote>
        ))}
      </div>

      <div className="mt-5 flex justify-center gap-2" aria-label="Testimonials pagination">
        {Array.from({ length: pageCount }, (_, pageIndex) => (
          <button
            key={pageIndex}
            type="button"
            aria-label={`Show testimonial page ${pageIndex + 1}`}
            onClick={() => scrollToIndex(pageIndex * itemsPerPage)}
            className={`h-2.5 w-2.5 rounded-full transition ${pageIndex === activePage ? "bg-brandPink" : "bg-brandBlue/35 hover:bg-brandBlue/60"}`}
          />
        ))}
      </div>
    </div>
  );
}
