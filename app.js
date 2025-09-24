/*
 * Storytelling parallax scaffolding.
 * Each section groups its layers; data-speed controls parallax ratio.
 * Individual figures can declare data-animate behaviours for scroll-driven effects.
 */

gsap.registerPlugin(ScrollTrigger);

const sections = gsap.utils.toArray(".story-section");

sections.forEach((section) => {
  const layers = section.querySelectorAll(".layer");
  layers.forEach((layer) => {
    const speed = parseFloat(layer.dataset.speed || "0.4");
    gsap.fromTo(
      layer,
      { yPercent: -18 * speed },
      {
        yPercent: 18 * speed,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  });

  const items = section.querySelectorAll(".parallax-item");
  items.forEach((item) => {
    const baseX = parseFloat(item.dataset.baseX || "0");
    const baseY = parseFloat(item.dataset.baseY || "0");
    const baseScale = parseFloat(item.dataset.baseScale || "1");

    item.style.setProperty("--base-x", baseX);
    item.style.setProperty("--base-y", baseY);
    item.style.setProperty("--scale", baseScale);

    const animationType = item.dataset.animate;
    if (animationType && animationType !== "none") {
      createScrollAnimation(item, animationType, section);
    }
  });
});

function createScrollAnimation(item, type, section) {
  const defaultConfig = {
    trigger: section,
    start: "top 80%",
    end: "bottom top",
  };

  switch (type) {
    case "fade-in":
      gsap.fromTo(
        item,
        { autoAlpha: 0, yPercent: 12 },
        {
          autoAlpha: 1,
          yPercent: 0,
          ease: "power1.out",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    case "zoom-in":
      gsap.fromTo(
        item,
        { autoAlpha: 0, scale: 0.65 },
        {
          autoAlpha: 1,
          scale: 1,
          ease: "power2.out",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    case "flash":
      gsap.fromTo(
        item,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          ease: "power3.out",
          duration: 0.6,
          scrollTrigger: {
            trigger: item,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
      break;

    case "slide-h": {
      const shift = parseFloat(item.dataset.shift || "25");
      gsap.fromTo(
        item,
        { xPercent: -shift },
        {
          xPercent: shift,
          ease: "none",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;
    }

    case "loop-rise":
      gsap.fromTo(
        item,
        { yPercent: -20 },
        {
          yPercent: 10,
          ease: "sine.inOut",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    case "orbit":
      gsap.fromTo(
        item,
        { rotation: -12, xPercent: -8 },
        {
          rotation: 12,
          xPercent: 8,
          ease: "sine.inOut",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    case "sweep":
      gsap.fromTo(
        item,
        { xPercent: -35, autoAlpha: 0.6 },
        {
          xPercent: 35,
          autoAlpha: 1,
          ease: "power1.inOut",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    case "bloom":
      gsap.fromTo(
        item,
        { scale: 0.55, autoAlpha: 0.4 },
        {
          scale: 1.2,
          autoAlpha: 1,
          ease: "power2.out",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    default:
      // Fall back to a gentle float tied to scroll.
      gsap.fromTo(
        item,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "sine.inOut",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
  }
}

// Small helper to highlight active section for debugging / layout tweaks.
ScrollTrigger.batch(".story-section", {
  onEnter: (batch) => batch.forEach((section) => section.classList.add("is-active")),
  onLeaveBack: (batch) => batch.forEach((section) => section.classList.remove("is-active")),
});
