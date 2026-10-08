"use client";

import { useEffect, useRef, useState } from "react";
import { LOGO_HTML } from "./logo";

type Lang = "fr" | "en";

/** Renders both language spans; CSS (#app.fr/[lang]) shows only the active one. */
function Bi({ fr, en }: { fr: string; en: string }) {
  return (
    <>
      <span lang="fr">{fr}</span>
      <span lang="en">{en}</span>
    </>
  );
}

export default function ComingSoon() {
  const [lang, setLang] = useState<Lang>("fr");
  const [error, setError] = useState<{ fr: string; en: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const spotRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const mailRef = useRef<HTMLInputElement>(null);
  const msgRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  // Restore saved language.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dz-lang");
      if (saved === "en") setLang("en");
    } catch {}
  }, []);

  // Persist language + keep <html lang> in sync.
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("dz-lang", lang);
    } catch {}
  }, [lang]);

  // Spotlight: follows the pointer, drifts slowly otherwise.
  useEffect(() => {
    const spot = spotRef.current;
    if (!spot) return;
    let last = 0;
    let raf = 0;
    const set = (x: string, y: string) => {
      spot.style.setProperty("--x", x + "%");
      spot.style.setProperty("--y", y + "%");
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      last = performance.now();
      set(((e.clientX / innerWidth) * 100).toFixed(1), ((e.clientY / innerHeight) * 100).toFixed(1));
    };
    addEventListener("pointermove", onMove);

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      const loop = (t: number) => {
        if (t - last > 2500) {
          set((70 + 16 * Math.sin(t / 4200)).toFixed(1), (34 + 18 * Math.sin(t / 3300)).toFixed(1));
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (done && doneRef.current) doneRef.current.focus();
  }, [done]);

  const msgPlaceholder = lang === "fr" ? "Événement, lancement, campagne…" : "Event, launch, campaign…";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = (nameRef.current?.value || "").trim();
    const mail = (mailRef.current?.value || "").trim();
    const message = (msgRef.current?.value || "").trim();
    const company = companyRef.current?.value || ""; // honeypot

    if (!name) {
      setError({ fr: "Indiquez votre nom.", en: "Add your name." });
      nameRef.current?.focus();
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(mail)) {
      setError({ fr: "Indiquez une adresse email valide.", en: "Add a valid email address." });
      mailRef.current?.focus();
      return;
    }

    setSending(true);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email: mail, message, language: lang, company }),
      });
      if (!r.ok) throw new Error("bad status");
    } catch {
      setSending(false);
      setError({
        fr: "L'envoi n'a pas abouti. Écrivez-nous à contact@dazzlea.agency.",
        en: "Sending failed. Email us at contact@dazzlea.agency.",
      });
      return;
    }

    const first = name.split(/\s+/)[0];
    setDone(
      lang === "fr"
        ? `Merci, ${first}. Nous revenons vers vous très vite.`
        : `Thank you, ${first}. We'll be in touch very soon.`,
    );
  }

  return (
    <div id="app" className={lang}>
      <div className="zel" id="spot" ref={spotRef} aria-hidden="true" />

      <header>
        <span dangerouslySetInnerHTML={{ __html: LOGO_HTML }} />
        <div className="lang" role="group" aria-label="Langue / Language">
          <button type="button" aria-pressed={lang === "fr"} onClick={() => setLang("fr")}>
            FR
          </button>
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
            EN
          </button>
        </div>
      </header>

      <main>
        <div>
          <h1>
            <span lang="fr">
              Le rideau se lève <span className="serif">bientôt.</span>
            </span>
            <span lang="en">
              Curtain up, <span className="serif">very soon.</span>
            </span>
          </h1>
          <p className="lede">
            <Bi
              fr="Notre nouveau site arrive. En attendant, parlez-nous de votre projet."
              en="Our new website is on its way. In the meantime, tell us about your project."
            />
          </p>
        </div>

        {done === null ? (
          <form id="cf" noValidate onSubmit={onSubmit}>
            <div className="fld">
              <label htmlFor="name">
                <Bi fr="Nom" en="Name" />
              </label>
              <input id="name" ref={nameRef} autoComplete="name" required />
            </div>
            <div className="fld">
              <label htmlFor="mail">Email</label>
              <input id="mail" ref={mailRef} type="email" autoComplete="email" required />
            </div>
            <div className="fld full">
              <label htmlFor="msg">
                <Bi fr="Votre projet" en="Your project" />
              </label>
              <input id="msg" ref={msgRef} placeholder={msgPlaceholder} />
            </div>

            {/* Honeypot: hidden from users; bots that fill it are rejected server-side. */}
            <input
              ref={companyRef}
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            <div className="send">
              <button className="btn" type="submit" id="send" disabled={sending}>
                <Bi fr="Envoyer" en="Send" />{" "}
                <span className="arr" aria-hidden="true">
                  →
                </span>
              </button>
              {error ? (
                <p className="err" role="alert">
                  <Bi fr={error.fr} en={error.en} />
                </p>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="done" ref={doneRef} tabIndex={-1}>
            <p>{done}</p>
          </div>
        )}
      </main>

      <footer>
        <span className="reach">
          <a href="mailto:contact@dazzlea.agency">contact@dazzlea.agency</a> ·{" "}
          <a href="tel:+212690097128">+212 690-097128</a> ·{" "}
          <a href="tel:+212661512283">+212 661-512283</a>
        </span>
        <nav aria-label="Réseaux sociaux">
          <a href="https://www.instagram.com/dazzlea.ma" target="_blank" rel="noopener">
            Instagram
          </a>
          <a href="https://www.linkedin.com/company/dazzlea" target="_blank" rel="noopener">
            LinkedIn
          </a>
          <a href="https://www.tiktok.com/@dazzlea.ma" target="_blank" rel="noopener">
            TikTok
          </a>
        </nav>
        <span>© 2026 Dazzlea · Casablanca</span>
      </footer>
    </div>
  );
}
