"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const workspaceStories = [
  {
    label: "Library",
    title: "Return to the page you left.",
    description:
      "Your local library keeps books searchable and remembers the chapter and reading position where you stopped.",
    image: "/screenshots/awthor-library-current.jpg",
    imageAlt: "Awthor library with locally stored books",
    caption: "Your local library",
  },
  {
    label: "Manuscript",
    title: "Stay inside one continuous book.",
    description:
      "Read, write, format, and move between chapters in one workspace. The structure remains present without becoming the work.",
    image: "/screenshots/awthor-read-mode.jpg",
    imageAlt: "Awthor continuous manuscript reading view",
    caption: "One continuous manuscript",
  },
  {
    label: "Proofing",
    title: "Revise without another reader in the room.",
    description:
      "On-device proofreading brings suggestions beside the chapter. Names, invented words, and Bengali transliterations can live in the book’s own dictionary.",
    image: "/screenshots/awthor-spell-check.jpg",
    imageAlt: "Awthor local spell-check drawer beside a chapter editor",
    caption: "On-device proofreading",
  },
];

export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-landing-root]");
    const hero = root?.querySelector<HTMLElement>("[data-parallax-root]");
    const writingLeaf = root?.querySelector<HTMLElement>("[data-writing-leaf]");

    if (!root || !hero) {
      return;
    }

    const layers = Array.from(hero.querySelectorAll<HTMLElement>("[data-parallax-speed]"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let heroVisible = true;
    let frame: number | null = null;

    root.dataset.motionReady = "true";

    const render = () => {
      frame = null;

      if (!heroVisible) {
        return;
      }

      const heroScroll = Math.min(Math.max(window.scrollY, 0), hero.offsetHeight);

      for (const layer of layers) {
        const speed = reducedMotion.matches ? 0 : Number(layer.dataset.parallaxSpeed ?? 0);
        const offset = Math.max(-18, Math.min(18, heroScroll * speed));
        layer.style.setProperty("--parallax-y", `${offset}px`);
      }
    };

    const scheduleRender = () => {
      if (frame === null) {
        frame = window.requestAnimationFrame(render);
      }
    };

    const heroObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry?.isIntersecting ?? false;
      hero.dataset.motionActive = String(heroVisible && !reducedMotion.matches);
      scheduleRender();
    });

    heroObserver.observe(hero);
    window.addEventListener("scroll", scheduleRender, { passive: true });
    reducedMotion.addEventListener("change", scheduleRender);

    let writingObserver: IntersectionObserver | null = null;

    if (writingLeaf) {
      if (reducedMotion.matches) {
        writingLeaf.dataset.written = "true";
      } else {
        writingObserver = new IntersectionObserver(
          ([entry], observer) => {
            if (entry?.isIntersecting) {
              writingLeaf.dataset.written = "true";
              observer.disconnect();
            }
          },
          { threshold: 0.35 },
        );
        writingObserver.observe(writingLeaf);
      }
    }

    render();

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", scheduleRender);
      reducedMotion.removeEventListener("change", scheduleRender);
      heroObserver.disconnect();
      writingObserver?.disconnect();
    };
  }, []);

  return null;
}

export function WorkspaceStory() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeStory, setActiveStory] = useState(0);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-workspace-step]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (current) {
          setActiveStory(Number((current.target as HTMLElement).dataset.workspaceStep ?? 0));
        }
      },
      { rootMargin: "-32% 0px -42% 0px", threshold: [0, 0.25, 0.5, 0.75] },
    );

    for (const step of steps) {
      observer.observe(step);
    }

    return () => observer.disconnect();
  }, []);

  const active = workspaceStories[activeStory];

  return (
    <div className="landing-workspace-story" ref={rootRef}>
      <div className="landing-workspace-gutter" aria-hidden="true">
        Contents
      </div>

      <div className="landing-workspace-layout">
        <div className="relative hidden lg:block">
          <figure className="landing-workspace-plate sticky top-28">
            <div className="landing-plate-head">
              <span>{active.label}</span>
              <span>Plate {String(activeStory + 1).padStart(2, "0")}</span>
            </div>
            <div className="relative aspect-[1.55/1] overflow-hidden">
              {workspaceStories.map((story, index) => (
                <Image
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 size-full object-cover object-top transition-opacity duration-500 motion-reduce:transition-none data-[active=false]:opacity-0"
                  data-active={activeStory === index}
                  fill
                  key={story.image}
                  sizes="(min-width: 1024px) 48vw, 100vw"
                  src={story.image}
                />
              ))}
            </div>
            <figcaption className="landing-plate-caption">
              <span>{active.caption}</span>
              <span>{String(activeStory + 1).padStart(2, "0")} / 03</span>
            </figcaption>
          </figure>
        </div>

        <div className="landing-workspace-entries">
          {workspaceStories.map((story, index) => (
            <article
              className="landing-story-entry"
              data-active={activeStory === index}
              data-workspace-step={index}
              key={story.title}
            >
              <p className="landing-story-label">{story.label}</p>
              <h3>{story.title}</h3>
              <p>{story.description}</p>

              <figure className="landing-workspace-plate mt-9 lg:hidden">
                <div className="landing-plate-head">
                  <span>{story.label}</span>
                  <span>Plate {String(index + 1).padStart(2, "0")}</span>
                </div>
                <Image
                  alt={story.imageAlt}
                  className="aspect-[1.55/1] w-full object-cover object-top"
                  height={998}
                  sizes="100vw"
                  src={story.image}
                  width={1920}
                />
                <figcaption className="landing-plate-caption">
                  <span>{story.caption}</span>
                  <span>{String(index + 1).padStart(2, "0")} / 03</span>
                </figcaption>
              </figure>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
