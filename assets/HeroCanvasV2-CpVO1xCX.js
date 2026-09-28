import{r as M,B as z,j as F}from"./index-cjWO6mdz.js";import{S as V,O as H,W,P as q,a as Y,V as j,M as B}from"./three-DSc-0QTv.js";const G=`
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
    vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
    vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;
    vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`,X=`
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`,K=`
  uniform float uTime;
  uniform vec2  uMouse;       // [-1, 1]
  uniform float uMousePace;   // [0, ~1] eased mouse velocity
  uniform float uAspect;      // viewport.width / viewport.height
  uniform float uDarkMix;     // 0 = light/cream, 1 = dark/navy
  varying vec2 vUv;
  ${G}

  // Tuning constants. Tune these to taste.
  // Tuned from full-HD screenshots of landonorris.com - the contours are
  // BIG sweeping curves (only 2-4 visible across a 1920px viewport), not
  // dense topographic detail. SCALE drives that.
  const float SCALE             = 0.72;  // base noise scale - LOWER = larger cells = fewer, sparser blobs across the viewport
  const float NOISE_DETAIL      = 3.0;   // number of contour bands per noise cell - LOWER = fewer parallel lines (less busy / fewer blobs)
  const float DISTORT_SCALE     = 0.55;  // size of the slow underlying blobs
  const float DISTORT_INTENSITY = 0.50;  // how much the slow blobs warp the contours
  const float HAIRLINE_PIXELS   = 1.5;   // contour line width in screen pixels (fwidth-driven)
  const float CURSOR_SCALE      = 1.5;   // falloff sharpness around the cursor
  const float CURSOR_INTENSITY  = 0.05;  // how much the cursor drags contour UVs

  // Near-isotropic noise sampling - contours form in all directions like a
  // real topographic map. NOT stretched into horizontal stripes.
  const vec2  ANISOTROPY        = vec2(1.0, 1.0);

  void main(){
    // Aspect-corrected UV so contours stay circular at any window ratio.
    vec2 uv = vUv;
    uv.x *= uAspect;

    // Mouse in the same UV space as the noise sample.
    vec2 mouse = uMouse * 0.5 + 0.5;
    mouse.x *= uAspect;
    float cursor = 1.0 - distance(mouse, uv) * CURSOR_SCALE;
    cursor *= uMousePace;
    cursor = clamp(cursor, 0.0, 1.0);

    // Layer 1: slow, large-scale noise.
    float noiseDistort = 0.5 + snoise(vec3(uv * DISTORT_SCALE, uTime * 0.1)) * 0.5;

    // Layer 2: low-frequency noise whose UV is warped by layer 1 + the cursor.
    vec2 warpedUv = (uv + cursor * CURSOR_INTENSITY + noiseDistort * DISTORT_INTENSITY) * SCALE * ANISOTROPY;
    float n = snoise(vec3(warpedUv, uTime));

    // Multiply by NOISE_DETAIL BEFORE fract() - this is the topographic-map
    // trick. With NOISE_DETAIL = 1, fract(n) wraps once per noise cell and
    // produces small closed loops around peaks/valleys. With NOISE_DETAIL = 4,
    // fract wraps four times per cell, producing FOUR PARALLEL contours that
    // flow along the noise gradient over long distances - exactly what makes
    // Lando's lines look like real elevation contours instead of pebbles.
    float bands = (n * 0.5 + 0.5) * NOISE_DETAIL;

    // Hairline contour lines using GLSL derivatives (fwidth) - resolution
    // independent. fwidth(bands) tracks per-pixel change in bands, so the
    // line stays HAIRLINE_PIXELS thick regardless of NOISE_DETAIL or SCALE.
    float contour = fract(bands);
    float dist    = abs(contour - 0.5);
    float w       = fwidth(bands) * HAIRLINE_PIXELS * 0.5;
    float line    = 1.0 - smoothstep(0.0, w, dist);

    // Paleta SofIA: fondo lavanda claro / índigo profundo y contornos que
    // recorren el degradado de marca azul -> violeta -> magenta según la
    // posición y el tiempo, para que las líneas "respiren" color.
    vec3 bgLight   = vec3(0.949, 0.941, 0.969); // #F2F0F7
    vec3 bgDark    = vec3(0.027, 0.024, 0.051); // #07060D
    vec3 cBlue     = vec3(0.184, 0.373, 0.816); // #2F5FD0
    vec3 cViolet   = vec3(0.416, 0.239, 0.710); // #6A3DB5
    vec3 cMagenta  = vec3(0.690, 0.180, 0.557); // #B02E8E
    float gpos     = clamp(vUv.x * 0.75 + vUv.y * 0.25 + sin(uTime * 0.35 + n) * 0.12, 0.0, 1.0);
    vec3 brand     = gpos < 0.5 ? mix(cBlue, cViolet, gpos * 2.0) : mix(cViolet, cMagenta, (gpos - 0.5) * 2.0);
    vec3 lineLight = mix(brand, vec3(0.30), 0.25);
    vec3 lineDark  = mix(brand, vec3(0.55), 0.35);

    vec3 bg      = mix(bgLight, bgDark, uDarkMix);
    vec3 lineCol = mix(lineLight, lineDark, uDarkMix);

    // Tiny cursor-velocity highlight so flicks leave a faint glow.
    lineCol += cursor * 0.04;

    // Line opacity: soft, tonal beige hairlines - lower alpha so
    // the contours read as a warm beige tint rather than stark black. The lower
    // contrast also hides most of the half-res upscale aliasing. Dark sections
    // use white lines on navy, kept legible at a similar low alpha.
    float lineAlpha = line * mix(0.35, 0.42, uDarkMix);
    vec3 color = mix(bg, lineCol, lineAlpha);

    gl_FragColor = vec4(color, 1.0);
  }
`;function Z(){const m=M.useRef(null);return M.useEffect(()=>{const a=m.current;if(!a)return;const C=window.matchMedia("(prefers-reduced-motion: reduce)").matches,D="ontouchstart"in window||window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||navigator.maxTouchPoints>0;if(C||D)return;const h=new V,p=new H(-1,1,1,-1,0,10);p.position.z=1;const o=new W({antialias:!1});o.setSize(window.innerWidth,window.innerHeight),o.setPixelRatio(Math.min(window.devicePixelRatio,1)),a.appendChild(o.domElement);const x=new j(0,0),i={value:z()==="dark"?1:0};let w=i.value;o.setClearColor(i.value?460301:15921399,1);const f=()=>{const e=z()==="dark";w=e?1:0,o.setClearColor(e?460301:15921399,1)};window.addEventListener("themechange",f);const y=new q(2,2),s=new Y({vertexShader:X,fragmentShader:K,uniforms:{uTime:{value:0},uMouse:{value:x},uMousePace:{value:0},uAspect:{value:window.innerWidth/window.innerHeight},uDarkMix:i}}),_=new B(y,s);h.add(_);let r={x:0,y:0},t={x:0,y:0};const g=e=>{r.x=e.clientX/window.innerWidth*2-1,r.y=-(e.clientY/window.innerHeight)*2+1};window.addEventListener("mousemove",g);const E=()=>{o.setSize(window.innerWidth,window.innerHeight),s.uniforms.uAspect.value=window.innerWidth/window.innerHeight};window.addEventListener("resize",E);let c=document.visibilityState!=="hidden";const b=()=>{const e=document.visibilityState!=="hidden";e&&!c?(c=!0,l=requestAnimationFrame(u)):c=e};document.addEventListener("visibilitychange",b);let l,L=0,v=performance.now();const k=1e3/30,N=.09;let S=0,T=0,d=0;function u(e=performance.now()){if(!c||(l=requestAnimationFrame(u),e-v<k-1))return;const n=Math.min(.05,(e-v)/1e3);v=e,L+=N*n;const I=1-Math.exp(-4*n);t.x+=(r.x-t.x)*I,t.y+=(r.y-t.y)*I,x.set(t.x,t.y);const A=(t.x-S)/Math.max(n,.001),R=(t.y-T)/Math.max(n,.001),O=Math.min(1,Math.sqrt(A*A+R*R)*.4),P=1-Math.exp(-8*n);d+=(O-d)*P,S=t.x,T=t.y;const U=1-Math.exp(-7*n);i.value+=(w-i.value)*U,s.uniforms.uTime.value=L,s.uniforms.uMousePace.value=d,o.render(h,p)}return u(),()=>{cancelAnimationFrame(l),document.removeEventListener("visibilitychange",b),window.removeEventListener("mousemove",g),window.removeEventListener("themechange",f),window.removeEventListener("resize",E),o.dispose(),a.contains(o.domElement)&&a.removeChild(o.domElement),y.dispose(),s.dispose()}},[]),F.jsx("div",{ref:m,className:"hero-canvas","aria-hidden":"true"})}export{Z as default};
