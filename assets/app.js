/* ═══════════════════════════════════════════════════════════════
   NEXT IMAGINATIONS — shared behaviour · v4 (dependency-free)
   ═══════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine   = window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* ───── preloader (first visit per session) ───── */
  var loader = document.querySelector(".loader");
  var seen = false;
  try { seen = sessionStorage.getItem("ni-loaded") === "1"; } catch(e){}
  if(loader){
    if(reduce || seen){
      loader.remove();
      document.body.classList.remove("is-loading");
    } else {
      document.body.classList.add("is-loading");
      var count = loader.querySelector("[data-count-el]");
      var bar = loader.querySelector(".loader__bar i");
      var n = 0;
      var tick = setInterval(function(){
        n = Math.min(100, n + Math.ceil(Math.random()*14));
        if(count) count.textContent = String(n).padStart(3,"0");
        if(bar) bar.style.transform = "scaleX(" + (n/100) + ")";
        if(n >= 100){
          clearInterval(tick);
          setTimeout(function(){
            loader.classList.add("done");
            document.body.classList.remove("is-loading");
            try { sessionStorage.setItem("ni-loaded","1"); } catch(e){}
            setTimeout(function(){ loader.remove(); }, 1100);
          }, 250);
        }
      }, 70);
    }
  }

  document.addEventListener("DOMContentLoaded", function(){

    /* ───── year stamps ───── */
    var y = String(new Date().getFullYear());
    document.querySelectorAll("[data-year]").forEach(function(el){ el.textContent = y; });

    /* ───── live studio clock (IST) ───── */
    var clocks = document.querySelectorAll("[data-clock]");
    if(clocks.length){
      var fmt;
      try { fmt = new Intl.DateTimeFormat("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Asia/Kolkata"}); } catch(e){ fmt = null; }
      var setClock = function(){
        var t = fmt ? fmt.format(new Date()) : new Date().toLocaleTimeString();
        clocks.forEach(function(el){ el.textContent = t.toUpperCase(); });
      };
      setClock(); setInterval(setClock, 15000);
    }

    /* ───── active nav ───── */
    var norm = function(s){ s = String(s||"").split("?")[0].split("/").pop() || "index.html"; return (s.replace(/\.html$/,"") || "index"); };
    var path = norm(location.pathname);
    document.querySelectorAll("[data-nav]").forEach(function(a){
      if(norm(a.getAttribute("data-nav")) === path) a.classList.add("is-current");
    });

    /* ───── nav: solid on scroll + hide on scroll-down ───── */
    var nav = document.querySelector(".nav");
    if(nav){
      var lastY = window.scrollY;
      var onScroll = function(){
        var yy = window.scrollY;
        nav.classList.toggle("is-solid", yy > 36);
        if(!document.body.classList.contains("menu-open")){
          nav.classList.toggle("is-hidden", yy > 400 && yy > lastY);
        }
        lastY = yy;
      };
      onScroll(); window.addEventListener("scroll", onScroll, {passive:true});
    }

    /* ───── scroll progress ───── */
    var prog = document.querySelector(".progress i");
    if(prog){
      var setProg = function(){
        var h = document.documentElement.scrollHeight - innerHeight;
        prog.style.transform = "scaleX(" + (h > 0 ? window.scrollY/h : 0) + ")";
      };
      setProg(); window.addEventListener("scroll", setProg, {passive:true});
      window.addEventListener("resize", setProg);
    }

    /* ───── fullscreen menu ───── */
    var burger = document.querySelector(".burger");
    var menu = document.querySelector(".menu");
    if(burger && menu){
      menu.querySelectorAll(".menu__list a").forEach(function(a,i){
        a.style.setProperty("--dl", (0.08 + i*0.06) + "s");
      });
      var setOpen = function(open){
        menu.classList.toggle("is-open", open);
        document.body.classList.toggle("menu-open", open);
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        document.body.style.overflow = open ? "hidden" : "";
        if(nav) nav.classList.remove("is-hidden");
      };
      burger.addEventListener("click", function(){ setOpen(!menu.classList.contains("is-open")); });
      menu.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", function(){ setOpen(false); }); });
      document.addEventListener("keydown", function(e){ if(e.key === "Escape") setOpen(false); });
    }

    /* ───── page transition veil on internal links ───── */
    var veil = document.querySelector(".veil");
    if(veil && !reduce){
      document.querySelectorAll('a[href$=".html"]').forEach(function(a){
        var href = a.getAttribute("href") || "";
        if(/^(https?:)?\/\//.test(href) || href.indexOf("#") === 0) return;
        a.addEventListener("click", function(e){
          if(e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
          var current = location.pathname.split("/").pop() || "index.html";
          if(href.split("#")[0] === current) return;
          e.preventDefault();
          veil.classList.add("on");
          setTimeout(function(){ location.href = href; }, 480);
        });
      });
      window.addEventListener("pageshow", function(){ veil.classList.remove("on"); });
    }

    /* ───── split headlines into masked lines ───── */
    document.querySelectorAll("[data-split]").forEach(function(el){
      // expects direct children spans OR raw <br>-separated content already wrapped as .ln
      el.classList.add("split");
    });

    /* ───── reveal on scroll ───── */
    var reveals = document.querySelectorAll(".reveal,.split");
    if(reduce || !("IntersectionObserver" in window)){
      reveals.forEach(function(el){ el.classList.add("in"); });
    } else {
      // Anything already within the first viewport reveals at once — no blank hero.
      reveals.forEach(function(el){
        if(el.getBoundingClientRect().top < innerHeight * 0.92) el.classList.add("in");
      });
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, {threshold:0.12, rootMargin:"0px 0px -8% 0px"});
      reveals.forEach(function(el){ io.observe(el); });
    }

    /* ───── rotating hero word ───── */
    document.querySelectorAll("[data-rotator]").forEach(function(rot){
      var words = rot.querySelectorAll("span");
      if(!words.length) return;
      var i = 0; words[0].classList.add("on");
      if(reduce || words.length < 2) return;
      setInterval(function(){
        words[i].classList.remove("on");
        i = (i+1) % words.length;
        words[i].classList.add("on");
      }, 2600);
    });

    /* ───── manifesto word-by-word scroll reveal ───── */
    document.querySelectorAll("[data-words]").forEach(function(el){
      var raw = el.textContent.trim().split(/\s+/);
      el.innerHTML = raw.map(function(w){
        var gold = /^\*/.test(w);
        var clean = w.replace(/^\*/,"");
        return '<span class="w'+(gold?" gold":"")+'">'+clean+'</span>';
      }).join(" ");
      var words = el.querySelectorAll(".w");
      if(reduce){ words.forEach(function(w){ w.classList.add("on"); }); return; }
      var onScroll = function(){
        var r = el.getBoundingClientRect();
        var start = innerHeight * 0.85, end = innerHeight * 0.35;
        var p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
        var lit = Math.floor(p * words.length);
        words.forEach(function(w,i){ w.classList.toggle("on", i < lit); });
      };
      onScroll(); window.addEventListener("scroll", onScroll, {passive:true});
    });

    /* ───── hero ghost parallax ───── */
    var ghost = document.querySelector(".hero__ghost");
    if(ghost && !reduce){
      window.addEventListener("scroll", function(){
        ghost.style.transform = "translateY(" + (window.scrollY * -0.12) + "px)";
      }, {passive:true});
    }

    /* ───── counters ───── */
    var counters = document.querySelectorAll("[data-count]");
    if(counters.length){
      var run = function(el){
        var target = parseFloat(el.getAttribute("data-count"));
        var dec = (el.getAttribute("data-dec")|0);
        var suf = el.getAttribute("data-suffix") || "";
        var pre = el.getAttribute("data-prefix") || "";
        if(reduce){ el.textContent = pre + target.toFixed(dec) + suf; return; }
        var dur = 1700, t0 = null;
        var step = function(ts){
          if(!t0) t0 = ts;
          var p = Math.min((ts - t0)/dur, 1);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = pre + (target*e).toFixed(dec) + suf;
          if(p < 1) requestAnimationFrame(step);
          else el.textContent = pre + target.toFixed(dec) + suf;
        };
        requestAnimationFrame(step);
      };
      if("IntersectionObserver" in window){
        var co = new IntersectionObserver(function(es){
          es.forEach(function(en){ if(en.isIntersecting){ run(en.target); co.unobserve(en.target); } });
        }, {threshold:0.5});
        counters.forEach(function(el){ co.observe(el); });
      } else counters.forEach(run);
    }

    /* ───── magnet on interactive elements (native cursor kept) ───── */
    if(fine && !reduce){
      document.querySelectorAll("[data-magnet]").forEach(function(el){
        var strength = parseFloat(el.getAttribute("data-magnet")) || 0.3;
        el.addEventListener("mousemove", function(e){
          var r = el.getBoundingClientRect();
          el.style.transform = "translate("+((e.clientX-(r.left+r.width/2))*strength)+"px,"+((e.clientY-(r.top+r.height/2))*strength)+"px)";
        });
        el.addEventListener("mouseleave", function(){ el.style.transform = ""; });
      });
    }

    /* ───── services index: preview panel swap ───── */
    var svcPanel = document.querySelector("[data-svc-panel]");
    var svcRows = document.querySelectorAll("[data-svc]");
    if(svcPanel && svcRows.length){
      var cards = {};
      svcPanel.querySelectorAll("[data-svc-card]").forEach(function(c){
        cards[c.getAttribute("data-svc-card")] = c;
      });
      var wrap = svcPanel.querySelector(".svc__cardwrap");
      var current = null, timer = null;
      var show = function(key){
        if(key === current || !cards[key]) return;
        current = key;
        svcRows.forEach(function(r){ r.classList.toggle("is-live", r.getAttribute("data-svc") === key); });
        if(reduce){
          Object.keys(cards).forEach(function(k){ cards[k].style.display = k === key ? "" : "none"; });
          return;
        }
        if(wrap){
          wrap.classList.add("swap");
          clearTimeout(timer);
          timer = setTimeout(function(){
            Object.keys(cards).forEach(function(k){ cards[k].style.display = k === key ? "" : "none"; });
            wrap.classList.remove("swap");
          }, 220);
        }
      };
      // init: show first
      var firstKey = svcRows[0].getAttribute("data-svc");
      Object.keys(cards).forEach(function(k){ cards[k].style.display = k === firstKey ? "" : "none"; });
      svcRows[0].classList.add("is-live");
      current = firstKey;
      svcRows.forEach(function(r){
        r.addEventListener("mouseenter", function(){ show(r.getAttribute("data-svc")); });
        r.addEventListener("focus", function(){ show(r.getAttribute("data-svc")); });
      });
    }

    /* ───── quotes slider ───── */
    document.querySelectorAll("[data-quotes]").forEach(function(q){
      var items = q.querySelectorAll(".quote-item");
      var dots = q.querySelectorAll(".quotes__dot");
      if(items.length < 2) return;
      var i = 0, t;
      var go = function(n){
        items[i].classList.remove("on"); if(dots[i]) dots[i].classList.remove("on");
        i = (n + items.length) % items.length;
        items[i].classList.add("on"); if(dots[i]) dots[i].classList.add("on");
      };
      var auto = function(){ clearInterval(t); if(!reduce) t = setInterval(function(){ go(i+1); }, 6500); };
      dots.forEach(function(d,k){ d.addEventListener("click", function(){ go(k); auto(); }); });
      auto();
    });

    /* ───── FAQ accordion ───── */
    document.querySelectorAll(".faq__item").forEach(function(item){
      var q = item.querySelector(".faq__q");
      var a = item.querySelector(".faq__a");
      if(!q || !a) return;
      q.setAttribute("aria-expanded","false");
      q.addEventListener("click", function(){
        var open = item.classList.toggle("open");
        q.setAttribute("aria-expanded", open ? "true":"false");
        a.style.maxHeight = open ? a.scrollHeight + "px" : "0";
      });
    });

    /* ───── services page: scroll-spy side nav ───── */
    var spyLinks = document.querySelectorAll(".svcnav a");
    if(spyLinks.length && "IntersectionObserver" in window){
      var map = {};
      spyLinks.forEach(function(a){ map[a.getAttribute("href").slice(1)] = a; });
      var so = new IntersectionObserver(function(es){
        es.forEach(function(en){
          if(en.isIntersecting){
            spyLinks.forEach(function(a){ a.classList.remove("on"); });
            var a = map[en.target.id]; if(a) a.classList.add("on");
          }
        });
      }, {rootMargin:"-30% 0px -60% 0px"});
      document.querySelectorAll(".disc__item[id]").forEach(function(s){ so.observe(s); });
    }

    /* ───── bundle builder (pricing) ───── */
    var builder = document.querySelector("[data-builder]");
    if(builder){
      var svcs = Array.prototype.slice.call(builder.querySelectorAll(".builder__svc"));
      var ebBtn = builder.querySelector("[data-eb]");
      var ebOn = false;
      var $ = function(sel){ return builder.querySelector(sel); };
      var inrFmt = function(n){ return "\u20B9" + Math.round(n).toLocaleString("en-IN"); };
      var bundleRate = function(c){ return c <= 1 ? 0 : c === 2 ? 0.10 : c === 3 ? 0.15 : 0.20; };

      function recalc(){
        var onceSum = 0, moSum = 0, count = 0;
        svcs.forEach(function(s){
          if(s.classList.contains("is-on")){
            count++;
            var p = parseFloat(s.getAttribute("data-price")) || 0;
            if(s.getAttribute("data-type") === "mo") moSum += p; else onceSum += p;
          }
        });
        var empty = $("[data-b-when-empty]"), some = $("[data-b-when-some]");
        if(count === 0){
          if(empty) empty.style.display = "";
          if(some) some.style.display = "none";
          return;
        }
        if(empty) empty.style.display = "none";
        if(some) some.style.display = "";
        var br = bundleRate(count);
        var eb = ebOn ? 0.15 : 0;
        var keep = (1 - br) * (1 - eb);
        var onceFinal = onceSum * keep, moFinal = moSum * keep;
        var saved = (onceSum + moSum) - (onceFinal + moFinal);
        $("[data-b-count]").textContent = count;
        $("[data-b-disc]").textContent = br ? (br*100).toFixed(0) + "%" : "—";
        var ebVal = $("[data-b-eb]"); if(ebVal) ebVal.textContent = eb ? "−15%" : "—";
        var onceRow = $("[data-b-once-row]"), moRow = $("[data-b-mo-row]");
        if(onceSum > 0){ onceRow.style.display = ""; $("[data-b-once]").textContent = inrFmt(onceFinal); }
        else onceRow.style.display = "none";
        if(moSum > 0){ moRow.style.display = ""; $("[data-b-mo]").textContent = inrFmt(moFinal) + "/mo"; }
        else moRow.style.display = "none";
        $("[data-b-save]").textContent = saved > 0 ? "You save " + inrFmt(saved) : "";
      }
      svcs.forEach(function(s){ s.addEventListener("click", function(){ s.classList.toggle("is-on"); recalc(); }); });
      if(ebBtn) ebBtn.addEventListener("click", function(){ ebOn = !ebOn; ebBtn.classList.toggle("is-on", ebOn); recalc(); });
      recalc();
    }

    /* ───── custom themed dropdowns ───── */
    document.querySelectorAll("[data-select]").forEach(function(sel){
      var trigger = sel.querySelector(".select__trigger");
      var valueEl = sel.querySelector("[data-select-value]");
      var input = sel.querySelector("[data-select-input]");
      var opts = Array.prototype.slice.call(sel.querySelectorAll(".select__opt"));
      var activeIdx = Math.max(0, opts.findIndex(function(o){ return o.classList.contains("is-sel"); }));
      function setActive(i){ opts.forEach(function(o,k){ o.classList.toggle("is-active", k===i); }); activeIdx=i; if(opts[i]) opts[i].scrollIntoView({block:"nearest"}); }
      function open(){ sel.classList.add("is-open"); trigger.setAttribute("aria-expanded","true"); setActive(activeIdx); }
      function close(){ sel.classList.remove("is-open"); trigger.setAttribute("aria-expanded","false"); }
      function choose(o){
        opts.forEach(function(x){ x.classList.remove("is-sel"); x.setAttribute("aria-selected","false"); });
        o.classList.add("is-sel"); o.setAttribute("aria-selected","true");
        var v = o.getAttribute("data-val"); valueEl.textContent = v; if(input) input.value = v;
        close(); trigger.focus();
      }
      trigger.addEventListener("click", function(){ sel.classList.contains("is-open") ? close() : open(); });
      opts.forEach(function(o,i){
        o.addEventListener("click", function(){ choose(o); });
        o.addEventListener("mousemove", function(){ setActive(i); });
      });
      trigger.addEventListener("keydown", function(e){
        var isOpen = sel.classList.contains("is-open");
        if(e.key === "Escape"){ close(); return; }
        if(!isOpen && (e.key==="ArrowDown"||e.key==="ArrowUp"||e.key==="Enter"||e.key===" ")){ e.preventDefault(); open(); return; }
        if(isOpen){
          if(e.key==="ArrowDown"){ e.preventDefault(); setActive(Math.min(activeIdx+1, opts.length-1)); }
          else if(e.key==="ArrowUp"){ e.preventDefault(); setActive(Math.max(activeIdx-1, 0)); }
          else if(e.key==="Enter"||e.key===" "){ e.preventDefault(); choose(opts[activeIdx]); }
          else if(e.key==="Tab"){ close(); }
        }
      });
      document.addEventListener("click", function(e){ if(!sel.contains(e.target)) close(); });
    });

    /* ───── logo click: scroll home / pulse ───── */
    var brand = document.querySelector(".brand");
    if(brand){
      brand.addEventListener("click", function(e){
        var page = location.pathname.split("/").pop() || "index.html";
        if(page === "index.html" || page === ""){
          e.preventDefault();
          window.scrollTo({ top:0, behavior: reduce ? "auto":"smooth" });
        }
        brand.classList.remove("pulse"); void brand.offsetWidth; brand.classList.add("pulse");
      });
    }

    /* ───── back to top ───── */
    document.querySelectorAll("[data-top]").forEach(function(b){
      b.addEventListener("click", function(e){
        e.preventDefault();
        window.scrollTo({ top:0, behavior: reduce ? "auto":"smooth" });
      });
    });

    /* ───── contact form → backend API ───── */
    var form = document.querySelector("[data-form]");
    if(form){
      var errEl = form.querySelector("[data-form-error]");
      var val = function(n){ var el = form.querySelector('[name="'+n+'"]'); return el ? el.value.trim() : ""; };
      var showErr = function(m){ if(errEl){ errEl.textContent = m; errEl.classList.add("show"); } };
      var clearErr = function(){ if(errEl){ errEl.textContent=""; errEl.classList.remove("show"); } };
      var succeed = function(){
        var card = form.closest("[data-form-wrap]") || form;
        card.innerHTML = '<div class="form-done"><div class="form-done__mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h3 class="d-3 display">Message received.</h3><p class="muted">Thank you — we read every enquiry personally and reply within one business day. For anything urgent, call us directly on +91 89300 06242.</p></div>';
      };
      form.addEventListener("submit", function(e){
        e.preventDefault();
        clearErr();
        var ok = true;
        form.querySelectorAll("[required]").forEach(function(f){
          var bad = f.type==="checkbox" ? !f.checked
                  : (!f.value.trim() || (f.type==="email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value)));
          f.classList.toggle("err", bad); if(bad) ok = false;
        });
        if(!ok){ showErr("Please add your name, a valid email, a short message, and tick the consent box."); return; }
        var payload = { name:val("name"), email:val("email"), company:val("company"), interest:val("interest"), message:val("message"), website:val("website"), source:"contact", consent:true };
        if(location.protocol === "file:"){
          showErr("This page was opened directly from a file, so it can't reach the server. Please open the site at http://localhost:3000 (the address shown in your terminal) instead of double-clicking the HTML file.");
          return;
        }
        var btn = form.querySelector("button[type=submit]");
        if(btn){ btn.disabled = true; btn.dataset.html = btn.innerHTML; btn.textContent = "Sending\u2026"; }
        fetch("/api/enquiries", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) })
          .then(function(r){ return r.json().catch(function(){ return { ok:r.ok, error:"Server returned an unexpected response (status "+r.status+")." }; }); })
          .then(function(d){
            if(d && d.ok){ succeed(); }
            else { showErr((d && d.error) || "Something went wrong. Please try again."); if(btn){ btn.disabled=false; btn.innerHTML=btn.dataset.html; } }
          })
          .catch(function(){
            var hint = (location.port && location.port !== "3000")
              ? "This page is running on port "+location.port+", but the server is on port 3000. Open http://localhost:3000 instead."
              : "We couldn't reach the server. Make sure it's running (npm run dev) and open http://localhost:3000.";
            showErr(hint + " Or email nextimaginations@gmail.com / call +91 89300 06242.");
            if(btn){ btn.disabled=false; btn.innerHTML=btn.dataset.html; }
          });
      });
    }

  });
})();

/* ═══ v6: consent, analytics beacon, newsletter, spots, site-check ═══ */
(function(){
  "use strict";
  document.addEventListener("DOMContentLoaded", function(){
    var C = localStorage.getItem("ni_consent");
    var banner = document.querySelector("[data-consent]");
    function beacon(){
      if(localStorage.getItem("ni_consent")!=="all") return;
      try{
        var body = JSON.stringify({p:location.pathname,r:document.referrer.slice(0,200)});
        fetch("/api/pv",{method:"POST",headers:{"Content-Type":"application/json"},body:body,keepalive:true});
      }catch(e){}
    }
    if(!C && banner){ banner.classList.add("show"); }
    else { beacon(); }
    if(banner){
      var close=function(v){ localStorage.setItem("ni_consent",v); banner.classList.remove("show");
        if(v==="all"){ beacon(); if(window.__ga_id){ location.reload(); } } };
      var a=banner.querySelector("[data-consent-all]"), e=banner.querySelector("[data-consent-essential]");
      if(a) a.addEventListener("click",function(){close("all")});
      if(e) e.addEventListener("click",function(){close("essential")});
    }

    /* WhatsApp float: reveal after slight scroll */
    var wa=document.querySelector(".wa-float");
    if(wa){ var sh=function(){ wa.classList.toggle("show", window.scrollY>250); };
      sh(); window.addEventListener("scroll",sh,{passive:true}); }

    /* newsletter (footer) */
    document.querySelectorAll("[data-nl]").forEach(function(f){
      f.addEventListener("submit",function(ev){
        ev.preventDefault();
        var em=f.email.value.trim(); if(!em) return;
        var btn=f.querySelector("button"); btn.disabled=true; btn.textContent="Sending…";
        fetch("/api/newsletter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:em})})
          .then(function(r){return r.json()})
          .then(function(d){ f.innerHTML='<p class="cap" style="color:#9ed8a8">'+((d&&d.message)||"Check your inbox to confirm.")+'</p>'; })
          .catch(function(){ btn.disabled=false; btn.textContent="Subscribe"; });
      });
    });

    /* paid consultation checkout */
    var cform = document.querySelector("[data-consult]");
    if(cform){
      var cbtn = cform.querySelector("[data-consult-btn]");
      var cmsg = cform.querySelector("[data-consult-msg]");
      var reset = function(){ cbtn.disabled=false; cbtn.textContent="Pay \u20B9500 & book"; };
      fetch("/api/consultation/config").then(function(r){return r.json()}).then(function(cfg){
        if(cfg && cfg.enabled===false){ cbtn.disabled=true; cmsg.style.color="#e0b978"; cmsg.textContent="Online booking is being switched on \u2014 please WhatsApp us to book meanwhile."; }
      }).catch(function(){});
      cform.addEventListener("submit", function(ev){
        ev.preventDefault();
        cmsg.style.color=""; cmsg.textContent="";
        var name=cform.name.value.trim(), email=cform.email.value.trim(), note=cform.note.value.trim();
        if(!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ cmsg.style.color="#eca3a3"; cmsg.textContent="Please enter your name and a valid email."; return; }
        if(typeof Razorpay==="undefined"){ cmsg.style.color="#eca3a3"; cmsg.textContent="Payment library didn\u2019t load \u2014 please refresh and try again."; return; }
        cbtn.disabled=true; cbtn.textContent="Starting\u2026";
        fetch("/api/consultation/order",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})
          .then(function(r){return r.json()})
          .then(function(o){
            if(!o.ok){ throw new Error(o.error||"Could not start payment."); }
            var rz=new Razorpay({ key:o.keyId, amount:o.amount, currency:"INR", name:"Next Imaginations", description:"45-minute paid consultation", order_id:o.orderId,
              prefill:{ name:name, email:email }, theme:{ color:"#C6A052" },
              modal:{ ondismiss:reset },
              handler:function(resp){
                cmsg.style.color=""; cmsg.textContent="Confirming your payment\u2026";
                fetch("/api/consultation/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_id:resp.razorpay_order_id,payment_id:resp.razorpay_payment_id,signature:resp.razorpay_signature,name:name,email:email,note:note})})
                  .then(function(r){return r.json()})
                  .then(function(v){
                    if(v.ok){ cform.innerHTML='<div class="reveal in"><span class="eyebrow" style="color:#9ed8a8">Booked \u2713</span><p class="lead mt-1" style="max-width:52ch">Thank you \u2014 your consultation is booked and a receipt is on its way to your inbox. A senior consultant will email you within one business day to schedule.</p></div>'; }
                    else { cmsg.style.color="#eca3a3"; cmsg.textContent=v.error||"We couldn\u2019t confirm the payment. If any amount was deducted it auto-refunds; please contact us."; reset(); }
                  }).catch(function(){ cmsg.style.color="#eca3a3"; cmsg.textContent="Network error confirming payment \u2014 please contact us."; reset(); });
              }
            });
            rz.on("payment.failed", function(resp){ cmsg.style.color="#eca3a3"; cmsg.textContent="Payment failed: "+((resp.error&&resp.error.description)||"please try again or use another method."); reset(); });
            rz.open(); reset();
          })
          .catch(function(e){ cmsg.style.color="#eca3a3"; cmsg.textContent=e.message||"Something went wrong."; reset(); });
      });
    }

    /* founding spots counter */
    var spEls=document.querySelectorAll("[data-spots]");
    if(spEls.length){ fetch("/api/spots").then(function(r){return r.json()}).then(function(d){ if(d&&d.ok) spEls.forEach(function(el){el.textContent=d.left}); }).catch(function(){ spEls.forEach(function(el){el.textContent="a few"}); }); }

    /* website health check tool */
    var sc=document.querySelector("[data-sitecheck]");
    if(sc){
      sc.addEventListener("submit",function(ev){
        ev.preventDefault();
        var err=sc.querySelector("[data-form-error]");
        err.classList.remove("show"); err.textContent="";
        if(!sc.consent.checked){ err.textContent="Please tick the consent box."; err.classList.add("show"); return; }
        var btn=sc.querySelector("button[type=submit]"); btn.disabled=true; btn.textContent="Scanning… (up to 10s)";
        fetch("/api/tools/site-check",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({url:sc.url.value.trim(),email:sc.email.value.trim()})})
        .then(function(r){return r.json()})
        .then(function(d){
          btn.disabled=false; btn.innerHTML="Run the check";
          if(!d.ok){ err.textContent=d.error||"Something went wrong."; err.classList.add("show"); return; }
          var box=document.querySelector("[data-sc-result]");
          box.style.display="block";
          var score=d.score, arc=document.querySelector("[data-sc-arc]");
          document.querySelector("[data-sc-score]").textContent=score;
          arc.style.transition="stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)";
          requestAnimationFrame(function(){ arc.style.strokeDashoffset=String(327-(327*score/100)); });
          document.querySelector("[data-sc-meta]").textContent=d.url+" · first response "+d.ms+" ms";
          document.querySelector("[data-sc-checks]").innerHTML=d.checks.map(function(c){
            return '<div class="check-row '+(c.ok?"ok":"bad")+'"><i>'+(c.ok?"✓":"✕")+'</i><div><b>'+c.k+'</b>'+(c.ok?"":'<small>'+c.tip+'</small>')+'</div></div>';
          }).join("");
          box.scrollIntoView({behavior:"smooth",block:"start"});
        })
        .catch(function(){ btn.disabled=false; btn.textContent="Run the check"; err.textContent="Could not reach the scanner. Try again."; err.classList.add("show"); });
      });
    }
  });
})();
