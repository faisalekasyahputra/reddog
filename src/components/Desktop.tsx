"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import type { RedditData } from "@/lib/reddit";

const config = {
  ticker: "$SNOOFI",
  ca: "SNoo98xXxPLACEHOLDERxXxPASTExREALxCAxHEREpump",
  links: {
    buy: "https://pump.fun/",
    x: "https://x.com/",
    tg: "https://t.me/",
    community: "https://t.me/",
    dex: "https://dexscreener.com/",
  },
};

const memes = [
  "Two suited Snoofi mascots look down from an alley",
  "Snoofi surfs beneath a towering ocean wave",
  "Snoofi lights a stove burner in a dim kitchen",
  "Snoofi smokes on a neon-lit city street",
  "Snoofi faces a basketball player at courtside",
  "Snoofi relaxes by a pool as an explosion erupts",
  "Snoofi DJs at a colorful beach party",
  "Snoofi overlooks a glowing city from a rooftop",
  "Snoofi speeds through a neon tunnel in a sports car",
  "Two Snoofi figures watch an industrial fire",
  "Snoofi perches on a man beneath green laser lights",
].map((alt, index) => ({
  src: `/assets/memes/meme-${String(index + 1).padStart(2, "0")}.avif`,
  alt,
}));

const links = [
  ["X", "Twitter / X", config.links.x],
  ["TG", "Telegram", config.links.tg],
  ["DX", "DexScreener", config.links.dex],
  ["PF", "pump.fun", config.links.buy],
] as const;

const biosLines = [
  { text: "SNOOFI BIOS (C) 1998-2026, Trench Software Inc.", delay: 60 },
  { text: "CPU : Pentium ORANGE @ 98 MHz", delay: 140 },
  { text: "Memory Test : ", delay: 100, memory: true },
  { text: "", delay: 80 },
  { text: "Detecting liquidity pool ....... [ ", tail: "OK", suffix: " ]", delay: 200 },
  { text: "Burning LP ..................... [ ", tail: "OK", suffix: " ]", delay: 220 },
  { text: "Revoking mint .................. [ ", tail: "OK", suffix: " ]", delay: 220 },
  { text: "Loading MEMES.SYS .............. [ ", tail: "OK", suffix: " ]", delay: 240 },
  { text: "Scanning for jeets ............. ", tail: "none found", dim: true, delay: 260 },
  { text: "", delay: 100 },
  { text: "Starting $SNOOFI 98 ...", delay: 380 },
];

const statusLines = [
  "warming up the upvotes...",
  "connecting to www.snoofi.wtf (56k)...",
  "locating whales...",
  "loading front page...",
];

const chartCloses = [66, 61, 63, 57, 52, 54, 48, 43, 45, 39, 34, 36, 30, 25, 27, 20, 15, 11];
const tileWidth = 250;
const loopWidth = tileWidth * memes.length;

type WindowName = "browser" | "community";
type Point = { left: number; top: number };
type DialogKind = "ca" | "howto" | "recycle";
type Dialog = { id: number; kind: DialogKind; left: number; top: number; z: number };
type DragState = { id: WindowName | number; pointerId: number; startX: number; startY: number; originX: number; originY: number };

function formatClock(date: Date) {
  let hour = date.getHours();
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${String(date.getMinutes()).padStart(2, "0")} ${suffix}`;
}

function formatScore(score: number) {
  return score >= 1000 ? `${(score / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(score);
}

export default function Desktop({ subreddit }: { subreddit: string }) {
  const [bootStage, setBootStage] = useState<"bios" | "splash" | "done">("bios");
  const [biosCount, setBiosCount] = useState(0);
  const [memoryCount, setMemoryCount] = useState(0);
  const [bootStatus, setBootStatus] = useState(statusLines[0]);
  const [clock, setClock] = useState("--:--");
  const [visible, setVisible] = useState<Record<WindowName, boolean>>({ browser: true, community: true });
  const [positions, setPositions] = useState<Partial<Record<WindowName, Point>>>({});
  const [windowZ, setWindowZ] = useState<Record<WindowName, number>>({ browser: 101, community: 102 });
  const [startOpen, setStartOpen] = useState(false);
  const [status, setStatus] = useState("Done");
  const [reddit, setReddit] = useState<RedditData | null>(null);
  const [redditLoading, setRedditLoading] = useState(true);
  const [redditError, setRedditError] = useState<string | null>(null);
  const [redditRetry, setRedditRetry] = useState(0);
  const [carouselOffset, setCarouselOffset] = useState(0);
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const bootDone = useRef(false);
  const paused = useRef(false);
  const zTop = useRef(102);
  const dialogId = useRef(0);
  const drag = useRef<DragState | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const winBodyRef = useRef<HTMLDivElement>(null);

  const finishBoot = useCallback(() => {
    if (bootDone.current) return;
    bootDone.current = true;
    setBootStage("done");
  }, []);

  useEffect(() => {
    document.body.classList.toggle("booting", bootStage !== "done");
    return () => document.body.classList.remove("booting");
  }, [bootStage]);

  useEffect(() => {
    let cancelled = false;
    const timers = new Set<number>();
    const wait = (delay: number) => new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, delay);
      timers.add(timer);
    });

    const run = async () => {
      for (let index = 0; index < biosLines.length; index += 1) {
        if (cancelled || bootDone.current) return;
        setBiosCount(index + 1);
        if (biosLines[index].memory) {
          for (const amount of [16384, 32768, 49152, 65536]) {
            await wait(70);
            if (cancelled || bootDone.current) return;
            setMemoryCount(amount);
          }
        }
        await wait(biosLines[index].delay);
      }
      if (cancelled || bootDone.current) return;
      setBootStage("splash");
      for (let index = 1; index < statusLines.length; index += 1) {
        await wait(650);
        if (cancelled || bootDone.current) return;
        setBootStatus(statusLines[index]);
      }
      await wait(650);
      if (!cancelled) finishBoot();
    };

    void run();
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [finishBoot]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") finishBoot();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [finishBoot]);

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const timer = window.setInterval(tick, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadReddit = async () => {
      setRedditLoading(true);
      setRedditError(null);

      try {
        const response = await fetch("/api/reddit", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data: unknown = await response.json();
        if (
          !response.ok ||
          (typeof data === "object" && data !== null && "error" in data)
        ) {
          throw new Error("Unable to load Reddit community.");
        }
        setReddit(data as RedditData);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRedditError("Unable to load Reddit community.");
      } finally {
        if (!controller.signal.aborted) setRedditLoading(false);
      }
    };

    void loadReddit();
    return () => controller.abort();
  }, [redditRetry]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("#startmenu") && !target.closest("#startbtn")) setStartOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let lastMs = 0;
    const spin = (ms: number) => {
      const delta = Math.min(0.05, (ms - lastMs) / 1000);
      lastMs = ms;
      if (!paused.current) setCarouselOffset((current) => (current + 28 * delta) % loopWidth);
      frame = window.requestAnimationFrame(spin);
    };
    frame = window.requestAnimationFrame(spin);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const vertexSource = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fragmentSource = `
precision mediump float;
uniform vec2 r;
uniform float t;
void main(){
  vec2 uv = gl_FragCoord.xy / r;
  float asp = r.x / r.y;
  uv.x *= asp;
  vec2 c1 = vec2(0.32*asp, 0.68) + 0.14*vec2(sin(t*0.31), cos(t*0.23));
  vec2 c2 = vec2(0.74*asp, 0.28) + 0.17*vec2(cos(t*0.19), sin(t*0.26));
  vec2 c3 = vec2(0.50*asp, 0.50) + 0.10*vec2(sin(t*0.13+2.0), cos(t*0.17+1.0));
  float pulse = 0.5 + 0.5*sin(t*0.7);
  float g = 0.0;
  g += smoothstep(0.95, 0.0, distance(uv, c1)) * (0.50 + 0.22*pulse);
  g += smoothstep(1.10, 0.0, distance(uv, c2)) * (0.42 + 0.22*(1.0-pulse));
  g += smoothstep(0.80, 0.0, distance(uv, c3)) * 0.30;
  g += 0.05*sin(9.0*distance(uv, c3) - t*1.4);
  g = clamp(g, 0.0, 1.0);
  vec3 red = vec3(0.95, 0.20, 0.00);
  vec3 orange = vec3(1.00, 0.45, 0.05);
  vec3 white = vec3(1.00, 0.96, 0.92);
  vec3 col = mix(red, orange, smoothstep(0.0, 0.65, g));
  col = mix(col, white, smoothstep(0.80, 1.0, g));
  gl_FragColor = vec4(col, 1.0);
}`;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, "r");
    const time = gl.getUniformLocation(program, "t");
    const speed = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.2 : 1;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    let frame = 0;
    const draw = (ms: number) => {
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, ms * 0.001 * speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = window.requestAnimationFrame(draw);
    };
    window.addEventListener("resize", resize);
    resize();
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frame);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  const bringToFront = (name: WindowName) => {
    const z = ++zTop.current;
    setWindowZ((current) => ({ ...current, [name]: z }));
  };

  const setWindowVisible = (name: WindowName, open: boolean) => {
    setVisible((current) => ({ ...current, [name]: open }));
    if (open) bringToFront(name);
  };

  const toggleWindow = (name: WindowName) => setWindowVisible(name, !visible[name]);

  const beginDrag = (event: PointerEvent<HTMLDivElement>, id: WindowName | number) => {
    if ((event.target as Element).closest("button")) return;
    const windowElement = event.currentTarget.parentElement;
    if (!windowElement) return;
    const rect = windowElement.getBoundingClientRect();
    drag.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
    };
    if (typeof id === "string") bringToFront(id);
    else {
      const z = ++zTop.current;
      setDialogs((current) => current.map((dialog) => dialog.id === id ? { ...dialog, z } : dialog));
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const point = {
      left: Math.max(-100, current.originX + event.clientX - current.startX),
      top: Math.max(0, current.originY + event.clientY - current.startY),
    };
    if (typeof current.id === "string") {
      setPositions((positionsNow) => ({ ...positionsNow, [current.id]: point }));
    } else {
      setDialogs((dialogsNow) => dialogsNow.map((dialog) => dialog.id === current.id ? { ...dialog, ...point } : dialog));
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };

  const openDialog = (kind: DialogKind) => {
    const id = ++dialogId.current;
    const left = Math.max(8, 140 + Math.random() * 140);
    const top = Math.max(8, 60 + Math.random() * 70);
    setDialogs((current) => [...current, { id, kind, left, top, z: ++zTop.current }]);
  };

  const closeDialog = (id: number) => setDialogs((current) => current.filter((dialog) => dialog.id !== id));

  const copyContract = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(config.ca);
      setStatus("CA copied. good luck soldier.");
    } catch {
      setStatus("Copy blocked — grab it from CA.txt manually");
    }
  };

  const navigateTo = (section: string) => {
    const id = section === "top" ? "sec-top" : `sec-${section}`;
    winBodyRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus(`Navigating to ${section} ...`);
  };

  const openExternal = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const retryReddit = () => setRedditRetry((current) => current + 1);
  const communityUrl = reddit?.community.url ?? `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/`;

  const act = (action: string) => {
    setStartOpen(false);
    if (action === "browser") setWindowVisible("browser", true);
    else if (action === "top") navigateTo("top");
    else if (action === "buy") {
      openExternal(config.links.buy);
      setStatus("Opening pump.fun ...");
    } else if (action === "tg") openExternal(config.links.tg);
    else if (action === "community") {
      openExternal(config.links.community);
      setStatus("Joining the official community ...");
    } else if (action === "copensub") openExternal(communityUrl);
    else if (action === "copyca") void copyContract();
    else if (action === "ca" || action === "howto" || action === "recycle") openDialog(action);
    else if (action === "reboot") window.location.reload();
  };

  const onActionKey = (event: KeyboardEvent<HTMLElement>, action: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      act(action);
    }
  };

  const windowStyle = (name: WindowName): CSSProperties => ({
    display: visible[name] ? "flex" : "none",
    zIndex: windowZ[name],
    ...(positions[name] ? { left: positions[name].left, top: positions[name].top, right: "auto" } : {}),
  });

  return (
    <>
      <canvas ref={canvasRef} id="bg" aria-hidden="true" />

      <svg width="0" height="0" className="svg-defs" aria-hidden="true">
        <defs>
          <g id="i-snoo">
            <line x1="55" y1="22" x2="72" y2="6" stroke="#ff4500" strokeWidth="5" />
            <circle cx="74" cy="5" r="6" fill="#ff4500" />
            <ellipse cx="55" cy="58" rx="34" ry="30" fill="#ff4500" />
            <circle cx="16" cy="56" r="9" fill="#ff4500" />
            <circle cx="94" cy="56" r="9" fill="#ff4500" />
            <circle cx="43" cy="52" r="6" fill="#fff" />
            <circle cx="67" cy="52" r="6" fill="#fff" />
            <path d="M40 70 Q55 80 70 70" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
          </g>
          <g id="i-doc">
            <path d="M7 2 h12 l6 6 v22 H7 z" fill="#fff" stroke="#b34700" strokeWidth="2" />
            <path d="M19 2 v6 h6" fill="none" stroke="#b34700" strokeWidth="2" />
            <line x1="11" y1="14" x2="21" y2="14" stroke="#ff8717" strokeWidth="2" />
            <line x1="11" y1="19" x2="21" y2="19" stroke="#ff8717" strokeWidth="2" />
            <line x1="11" y1="24" x2="17" y2="24" stroke="#ff8717" strokeWidth="2" />
          </g>
          <g id="i-cart">
            <path d="M3 5 h5 l4 15 h13 l4 -11 H10" fill="none" stroke="#fff" strokeWidth="2.5" />
            <circle cx="13" cy="26" r="2.5" fill="#fff" />
            <circle cx="24" cy="26" r="2.5" fill="#fff" />
          </g>
          <g id="i-globe">
            <circle cx="16" cy="16" r="13" fill="none" stroke="#fff" strokeWidth="2.5" />
            <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="#fff" strokeWidth="2" />
            <line x1="3" y1="16" x2="29" y2="16" stroke="#fff" strokeWidth="2" />
          </g>
          <g id="i-bin">
            <path d="M8 9 h16 l-2 20 H10 z" fill="none" stroke="#fff" strokeWidth="2.5" />
            <line x1="5" y1="9" x2="27" y2="9" stroke="#fff" strokeWidth="2.5" />
            <line x1="13" y1="9" x2="13" y2="5" stroke="#fff" strokeWidth="2.5" />
            <line x1="19" y1="9" x2="19" y2="5" stroke="#fff" strokeWidth="2.5" />
            <line x1="13" y1="14" x2="14" y2="25" stroke="#fff" strokeWidth="2" />
            <line x1="19" y1="14" x2="18" y2="25" stroke="#fff" strokeWidth="2" />
          </g>
        </defs>
      </svg>

      {bootStage === "bios" && (
        <div id="bios" aria-live="polite">
          {biosLines.slice(0, biosCount).map((line, index) => (
            <div key={index}>
              {line.text || "\u00a0"}
              {line.memory && <>{memoryCount}K {memoryCount === 65536 && <span className="ok">OK</span>}</>}
              {line.tail && <span className={line.dim ? "dim" : "ok"}>{line.tail}</span>}
              {line.suffix}
            </div>
          ))}
        </div>
      )}
      {bootStage !== "done" && <button type="button" id="boot-skip" onClick={finishBoot}>ESC to skip &gt;&gt;</button>}

      {bootStage === "splash" && (
        <div id="splash">
          <div>
            <Image className="brand-logo splash-logo" src="/assets/character/snoofi-head-transparent.png" width={110} height={96} alt="" priority />
            <div className="ticker">$SNOOFI</div>
            <div className="sub">the front page of the trenches</div>
          </div>
          <div className="bootbar"><div className="segs" /></div>
          <div id="bootstatus">{bootStatus}</div>
        </div>
      )}

      <div id="desktop" className={bootStage === "done" ? "on" : ""}>
        <div className="dicons">
          <div className="dicon" tabIndex={0} role="button" onClick={() => act("buy")} onKeyDown={(event) => onActionKey(event, "buy")}>
            <svg width="32" height="32" viewBox="0 0 32 32"><use href="#i-cart" /></svg><span className="lbl">buy.exe</span>
          </div>
          <div className="dicon" tabIndex={0} role="button" onClick={() => act("ca")} onKeyDown={(event) => onActionKey(event, "ca")}>
            <svg width="32" height="32" viewBox="0 0 32 32"><use href="#i-doc" /></svg><span className="lbl">CA.txt</span>
          </div>
          <div className="dicon" tabIndex={0} role="button" onClick={() => act("browser")} onKeyDown={(event) => onActionKey(event, "browser")}>
            <svg width="32" height="32" viewBox="0 0 32 32"><use href="#i-globe" /></svg><span className="lbl">snoofi.exe</span>
          </div>
          <div className="dicon" tabIndex={0} role="button" onClick={() => act("recycle")} onKeyDown={(event) => onActionKey(event, "recycle")}>
            <svg width="32" height="32" viewBox="0 0 32 32"><use href="#i-bin" /></svg><span className="lbl">Recycle Bin (fud)</span>
          </div>
        </div>

        <div className="win" id="browser" style={windowStyle("browser")} onPointerDown={() => bringToFront("browser")}>
          <div className="titlebar" onPointerDown={(event) => beginDrag(event, "browser")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <svg width="16" height="14" viewBox="0 0 110 96"><use href="#i-snoo" /></svg>
            <span className="ttext">$SNOOFI - THE OFFICIAL REDDIT MASCOT</span>
            <button type="button" className="tbtn" aria-label="Minimize" onClick={() => setWindowVisible("browser", false)}>_</button>
            <button type="button" className="tbtn" aria-label="Close" onClick={() => setWindowVisible("browser", false)}>X</button>
          </div>
          <div className="menubar"><span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>V</u>iew</span><span><u>A</u>pe</span><span><u>H</u>odl</span></div>
          <div className="addrbar"><span>Address</span><div className="field sunken" id="addr">http://www.snoofi.wtf/</div><button type="button" className="bold">Go</button></div>
          <div className="winbody" id="winbody" ref={winBodyRef}>
            <div className="r-head">
              <div className="r-logo" role="button" tabIndex={0} onClick={() => navigateTo("top")} onKeyDown={(event) => onActionKey(event, "top")}>
                <Image className="brand-logo header-logo" src="/assets/character/snoofi-head-transparent.png" width={26} height={24} alt="" />$SNOOFI
              </div>
              <div className="r-nav">
                <button type="button" onClick={() => navigateTo("lore")}>LORE</button>
                <button type="button" onClick={() => navigateTo("video")}>VIDEO</button>
                <button type="button" onClick={() => navigateTo("memes")}>MEMES</button>
                <button type="button" className="buy" onClick={() => act("buy")}>BUY</button>
              </div>
            </div>

            <div className="page">
              <div className="content">
                <section id="sec-top">
                  <div className="slot hero sunken">
                    <div className="ph"><svg width="70" height="61" viewBox="0 0 110 96" opacity="0.5"><use href="#i-snoo" /></svg><div className="big">HERO IMAGE</div><div>drop assets/hero.png — wide format, ~1600 x 900</div></div>
                  </div>
                </section>

                <section id="sec-lore" className="lore">
                  <div className="sechead"><h2>LORE</h2><div className="rule" /></div>
                  <p className="dropcap">Snoo has worked the front page since 2005. Twenty-one years greeting every lurker at the door — through the blackouts, the API wars, the IPO roadshow — always smiling, always the same blank white face. Total compensation to date: zero dollars, zero shares, one antenna.</p>
                  <p>Then the bell rang on Wall Street and the mascot checked the cap table. Founders: on it. Funds: on it. The face of the entire website: on a sticker sheet in the merch store, marked down 30%.</p>
                  <p>So the mascot went DeFi. $SNOOFI is Snoo&apos;s self-issued severance — the mascot of the front page, unofficially on-chain, where no admin can delete it and no board can dilute it. The antenna finally picks up something useful: liquidity. LP burned. Mint revoked. Smile permanent.</p>
                  <p className="sig">the mascot is free. the mascot is financial.</p>
                </section>

                <section id="sec-video">
                  <div className="sechead"><h2>VIDEO</h2><div className="rule" /></div>
                  <div className="player">
                    <div className="pbar"><span>snoofi.mp4</span><span>1998 kbps</span></div>
                    <div className="slot vid sunken"><div className="ph"><div className="big">VIDEO SLOT</div><div>drop assets/video.mp4 — 16:9, Kling output goes here</div></div></div>
                    <div className="controls"><button type="button">&#9658;</button><button type="button">&#10074;&#10074;</button><button type="button">&#9632;</button><div className="track" /><button type="button">Full</button></div>
                  </div>
                </section>

                <section id="sec-memes">
                  <div className="sechead"><h2>MEMES</h2><div className="rule" /></div>
                  <div className="scroller-wrap">
                    <button type="button" className="scrollbtn" aria-label="scroll left" onClick={() => setCarouselOffset((current) => (current - tileWidth + loopWidth) % loopWidth)}>&lt;</button>
                    <div className="scroller" id="memescroll" onPointerEnter={() => { paused.current = true; }} onPointerLeave={() => { paused.current = false; }}>
                      <div className="mtrack" style={{ transform: `translateX(${-carouselOffset}px)` }}>
                        {[...memes, ...memes].map((meme, index) => (
                          <div className="meme" key={`${meme.src}-${index}`} aria-hidden={index >= memes.length}>
                            <div className="mimg"><Image src={meme.src} alt={index < memes.length ? meme.alt : ""} width={2048} height={2048} sizes="240px" /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button type="button" className="scrollbtn" aria-label="scroll right" onClick={() => setCarouselOffset((current) => (current + tileWidth) % loopWidth)}>&gt;</button>
                  </div>
                </section>
              </div>

              <div className="r-side">
                <div className="sbox"><h3>$SNOOFI</h3><div className="inner">
                  <div className="stat"><span>supply</span><b>1,000,000,000</b></div><div className="stat"><span>tax</span><b>0 / 0</b></div><div className="stat"><span>LP</span><b>burned</b></div><div className="stat"><span>mint</span><b>revoked</b></div>
                  <div className="contract-label">contract address</div><div className="ca-field sunken" id="ca-side">{config.ca}</div>
                  <button type="button" className="bigbtn" onClick={() => act("copyca")}>Copy CA</button><button type="button" className="bigbtn buy" onClick={() => act("buy")}>BUY $SNOOFI</button>
                </div></div>
                <div className="sbox"><h3>Official Community</h3><div className="inner"><div className="community-copy">the official $SNOOFI community. mascot enjoyers only.</div><div className="stat"><span>members</span><b>growing</b></div><div className="stat"><span>fud</span><b>0</b></div><button type="button" className="bigbtn buy" onClick={() => act("community")}>JOIN COMMUNITY</button></div></div>
                <div className="sbox"><h3>Links</h3><div className="inner" id="linkbox">{links.map(([tag, label, url]) => <button type="button" className="linkrow" key={label} onClick={() => openExternal(url)}><b>{tag}</b><span>{label}</span></button>)}</div></div>
                <div className="sbox"><h3>Chart (trust me)</h3><div className="inner"><div className="chartwrap sunken"><svg id="chart" width="100%" height="80" viewBox="0 0 180 80" preserveAspectRatio="none">{chartCloses.map((close, index) => { const open = index ? chartCloses[index - 1] : 70; const x = 4 + index * 10; return <g key={x}><line x1={x + 3} y1={Math.min(open, close) - 4} x2={x + 3} y2={Math.max(open, close) + 4} stroke="#1a9e3c" strokeWidth="1" /><rect x={x} y={Math.min(open, close)} width="6" height={Math.max(2, Math.abs(open - close))} fill={close < open ? "#1a9e3c" : "#e05a2b"} /></g>; })}</svg></div><div className="chart-caption">up only (financial advice)</div></div></div>
              </div>
            </div>
          </div>
          <div className="statusbar"><div className="pane" id="statusmsg">{status}</div><div className="pane sm">upvote zone</div></div>
        </div>

        <div className="win" id="community" style={windowStyle("community")} onPointerDown={() => bringToFront("community")}>
          <div className="titlebar" onPointerDown={(event) => beginDrag(event, "community")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <svg width="16" height="14" viewBox="0 0 110 96"><use href="#i-snoo" /></svg><span className="ttext" id="ctitlebar">r/{reddit?.community.name ?? subreddit} — Community Monitor</span><button type="button" className="tbtn" aria-label="Close" onClick={() => setWindowVisible("community", false)}>X</button>
          </div>
          <div className="menubar"><span><u>F</u>ile</span><span><u>V</u>iew</span><button type="button" className="menu-action" onClick={retryReddit}><u>R</u>efresh</button></div>
          <div className="winbody">
            <div className="chead2"><div><span className="cname" id="csub">r/{reddit?.community.name ?? subreddit}</span>{reddit && <><div className="ctitle">{reddit.community.title}</div><div className="cmeta">{reddit.community.description}</div></>}</div><button type="button" className="bold" onClick={() => act("copensub")}>Open on reddit</button></div>
            {reddit && !redditLoading && !redditError && <div className="cstats" id="cstats"><div className="stat"><span>members</span><b>{reddit.community.subscribers.toLocaleString()}</b></div><div className="stat"><span>online</span><b>{reddit.community.activeUsers.toLocaleString()}</b></div></div>}
            <div id="cfeed">
              {redditLoading ? (
                <div className="crow">Connecting to reddit ...</div>
              ) : redditError ? (
                <div className="crow"><div className="cbody"><div className="ctitle">{redditError}</div><button type="button" onClick={retryReddit}>Retry</button></div></div>
              ) : reddit?.posts.map((post) => (
                <a className="crow" key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer">
                  <div className="cscore">{formatScore(post.score)}</div>
                  <div className="cbody"><div className="ctitle">{post.title}</div><div className="cmeta">u/{post.author} - {post.commentCount} comments</div></div>
                </a>
              ))}
            </div>
          </div>
          <div className="statusbar"><div className="pane" id="cstatus">{redditLoading ? "loading" : redditError ? "connection failed" : `last synced ${reddit ? formatClock(new Date(reddit.fetchedAt)) : "--:--"} — ${reddit?.posts.length ?? 0} hot posts`}</div><div className="pane sm"><button type="button" className="refresh-btn" onClick={retryReddit}>{redditError ? "Retry" : "Refresh"}</button></div></div>
        </div>

        {dialogs.map((dialog) => (
          <div className="win dlg" key={dialog.id} style={{ left: dialog.left, top: dialog.top, zIndex: dialog.z }} onPointerDown={() => { const z = ++zTop.current; setDialogs((current) => current.map((item) => item.id === dialog.id ? { ...item, z } : item)); }}>
            <div className="titlebar" onPointerDown={(event) => beginDrag(event, dialog.id)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><span className="ttext">{dialog.kind === "ca" ? "CA.txt — Notepad" : dialog.kind === "howto" ? "How to buy — Wizard" : "Recycle Bin"}</span><button type="button" className="tbtn" aria-label="Close" onClick={() => closeDialog(dialog.id)}>X</button></div>
            <div className="content2">
              {dialog.kind === "ca" && <><div className="dialog-copy">official {config.ticker} contract address:</div><div className="ca-field sunken wrap-ca">{config.ca}</div><div className="dialog-note">verify on DexScreener before buying. always.</div></>}
              {dialog.kind === "howto" && <><div className="stepline"><div className="n">1</div><div>get a Solana wallet (Phantom works)</div></div><div className="stepline"><div className="n">2</div><div>load it with SOL from any exchange</div></div><div className="stepline"><div className="n">3</div><div>paste the CA into pump.fun or your DEX</div></div><div className="stepline"><div className="n">4</div><div>swap. hold. do not check the chart hourly (you will)</div></div></>}
              {dialog.kind === "recycle" && <div>contents: <b>all of the fud</b> (permanently deleted)</div>}
            </div>
            <div className="btnrow">
              {dialog.kind === "ca" && <button type="button" onClick={() => act("copyca")}>Copy</button>}
              {dialog.kind === "howto" && <button type="button" onClick={() => act("buy")}>Finish - Buy</button>}
              <button type="button" onClick={() => closeDialog(dialog.id)}>{dialog.kind === "howto" ? "Cancel" : dialog.kind === "ca" ? "Close" : "OK"}</button>
            </div>
          </div>
        ))}
      </div>

      <div id="taskbar">
        <button type="button" id="startbtn" onClick={(event) => { event.stopPropagation(); setStartOpen((open) => !open); }}><svg width="16" height="14" viewBox="0 0 110 96"><use href="#i-snoo" /></svg>Start</button>
        <button type="button" className={`taskbtn${visible.browser ? " active" : ""}`} id="task-browser" onClick={() => toggleWindow("browser")}>$SNOOFI — Internet Explorer</button>
        <button type="button" className={`taskbtn${visible.community ? " active" : ""}`} id="task-community" onClick={() => toggleWindow("community")}>Community Monitor</button>
        <div id="tray"><span id="clock">{clock}</span></div>
      </div>

      <div className={`win${startOpen ? " open" : ""}`} id="startmenu">
        <div className="rail">$SNOOFI&nbsp;98</div>
        <div className="items">
          <button type="button" className="item" onClick={() => act("buy")}><svg width="18" height="18" viewBox="0 0 32 32" className="start-cart"><use href="#i-cart" /></svg><span>Buy $SNOOFI</span></button>
          <button type="button" className="item" onClick={() => act("copyca")}><span className="start-ca">CA</span><span>Copy CA</span></button>
          <button type="button" className="item" onClick={() => act("howto")}><b>?</b><span>How to buy (wizard)</span></button>
          <button type="button" className="item" onClick={() => act("tg")}><b>TG</b><span>Telegram</span></button>
          <div className="divider" />
          <button type="button" className="item" onClick={() => act("reboot")}><b>&#8635;</b><span>Shut Down... (reboot)</span></button>
        </div>
      </div>
    </>
  );
}
