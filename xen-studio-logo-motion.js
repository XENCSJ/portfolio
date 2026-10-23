/* Derived from INDEX at 05da15cc98e50ef5b24ded41474065ffd667975f.
 * Same 23 subpaths, clip silhouette, stroke width, order and timing formulas.
 * STUDIO owns one clock for all three rows. No category/MVV/text changes. */
(() => {
  'use strict';
  const stage = document.querySelector('body.studio-page .studio-fusion-logo');
  const image = stage?.querySelector('img');
  if (!stage || !image || stage.dataset.studioLogoInitialized) return;
  stage.dataset.studioLogoInitialized = 'true';
  let overlay, timer, started = false, reduced;
  const settle = () => {
    clearTimeout(timer);
    stage.dataset.studioLogoState = 'complete';
    overlay?.remove();
  };
  try {
    const names = ['original','sequential-trace','soft-reveal','reverse-trace','dual-reveal'];
    const forced = new URLSearchParams(location.search).get('xen-studio-set');
    let index;
    if (/^[1-5]$/.test(forced || '')) index = Number(forced) - 1;
    else {
      try {
        const value = new Uint32Array(1);
        do { crypto.getRandomValues(value); } while (value[0] === 4294967295);
        index = value[0] % 5;
      } catch (_) { index = Math.floor(Math.random() * 5); }
    }
    const name = names[index];
    const duration = [2500,2800,3500,3000,3200][index];
    stage.dataset.studioLogoSet = name;
    stage.style.setProperty('--studio-logo-duration', `${duration}ms`);
    reduced = matchMedia('(prefers-reduced-motion: reduce)');
    // Static artwork is always the default, including absent CSS, JS or SVG support.
    if (reduced.matches || getComputedStyle(stage).getPropertyValue('--studio-logo-motion-ready').trim() !== '1') {
      settle(); return;
    }
    const template = document.createElement('template');
    template.innerHTML = "<svg class=\"studio-logo-trace\" viewBox=\"0 0 2232 2293\" preserveAspectRatio=\"xMidYMid meet\" aria-hidden=\"true\" focusable=\"false\">\n<defs><clipPath id=\"studio-logo-clip\" clipPathUnits=\"userSpaceOnUse\"><path d=\"M 819 2171 L 819 2257 L 1412 2256 L 1411 2170 Z M 908 1918 L 908 2003 L 910 2004 L 1412 2003 L 1412 1917 Z M 1634 1663 L 1632 1665 L 1632 1749 L 1634 1751 L 2072 1751 L 2074 1753 L 1633 2194 L 1632 2255 L 1634 2257 L 1680 2258 L 2225 2258 L 2227 2255 L 2226 2170 L 1787 2170 L 1785 2167 L 2226 1726 L 2226 1664 Z M 819 1664 L 819 1750 L 821 1751 L 1412 1750 L 1412 1664 L 1410 1663 Z M 598 1664 L 511 1664 L 510 2104 L 507 2104 L 67 1664 L 6 1664 L 4 1698 L 4 2256 L 92 2256 L 92 1817 L 95 1816 L 536 2257 L 597 2257 Z M 259 939 L 258 1442 L 344 1443 L 345 940 Z M 2139 850 L 2139 1442 L 2226 1443 L 2227 852 L 2226 850 Z M 1886 850 L 1886 1353 L 1971 1354 L 1973 1352 L 1973 851 Z M 512 850 L 511 1442 L 598 1443 L 598 850 Z M 1635 849 L 1632 852 L 1632 1441 L 1633 1443 L 1719 1443 L 1720 851 L 1718 849 Z M 7 849 L 4 851 L 4 1442 L 91 1443 L 92 851 L 89 849 Z M 751 781 L 750 1511 L 1479 1512 L 1481 1510 L 1481 782 Z M 937 1402 L 1114 1224 L 1119 1226 L 1293 1400 L 1291 1404 L 939 1404 Z M 1250 1201 L 1370 1200 L 1373 1203 L 1373 1322 L 1371 1324 L 1367 1322 L 1250 1205 Z M 979 1200 L 981 1204 L 861 1324 L 859 1324 L 858 1202 L 861 1200 Z M 1371 968 L 1373 970 L 1373 1090 L 1371 1092 L 1251 1092 L 1249 1090 Z M 860 968 L 982 1090 L 980 1092 L 860 1092 L 858 1090 L 858 970 Z M 938 890 L 1292 889 L 1293 892 L 1115 1069 L 938 892 Z M 819 543 L 819 629 L 1412 628 L 1411 542 Z M 819 290 L 820 376 L 1323 375 L 1322 289 Z M 1634 35 L 1632 87 L 1633 629 L 1720 628 L 1720 190 L 1722 188 L 2164 629 L 2225 629 L 2226 36 L 2139 36 L 2139 475 L 2136 477 L 1695 36 Z M 819 36 L 820 123 L 1412 122 L 1411 35 Z M 5 35 L 5 123 L 445 123 L 446 126 L 4 568 L 4 628 L 598 629 L 597 542 L 159 542 L 157 540 L 598 98 L 598 36 Z\" clip-rule=\"evenodd\"/></clipPath></defs>\n<g clip-path=\"url(#studio-logo-clip)\" fill=\"none\" stroke=\"#C5A059\" stroke-width=\"18\" stroke-linejoin=\"miter\" stroke-linecap=\"butt\">\n<path class=\"studio-logo-guide\" d=\"M 819 2171 L 819 2257 L 1412 2256 L 1411 2170 Z M 908 1918 L 908 2003 L 910 2004 L 1412 2003 L 1412 1917 Z M 1634 1663 L 1632 1665 L 1632 1749 L 1634 1751 L 2072 1751 L 2074 1753 L 1633 2194 L 1632 2255 L 1634 2257 L 1680 2258 L 2225 2258 L 2227 2255 L 2226 2170 L 1787 2170 L 1785 2167 L 2226 1726 L 2226 1664 Z M 819 1664 L 819 1750 L 821 1751 L 1412 1750 L 1412 1664 L 1410 1663 Z M 598 1664 L 511 1664 L 510 2104 L 507 2104 L 67 1664 L 6 1664 L 4 1698 L 4 2256 L 92 2256 L 92 1817 L 95 1816 L 536 2257 L 597 2257 Z M 259 939 L 258 1442 L 344 1443 L 345 940 Z M 2139 850 L 2139 1442 L 2226 1443 L 2227 852 L 2226 850 Z M 1886 850 L 1886 1353 L 1971 1354 L 1973 1352 L 1973 851 Z M 512 850 L 511 1442 L 598 1443 L 598 850 Z M 1635 849 L 1632 852 L 1632 1441 L 1633 1443 L 1719 1443 L 1720 851 L 1718 849 Z M 7 849 L 4 851 L 4 1442 L 91 1443 L 92 851 L 89 849 Z M 751 781 L 750 1511 L 1479 1512 L 1481 1510 L 1481 782 Z M 937 1402 L 1114 1224 L 1119 1226 L 1293 1400 L 1291 1404 L 939 1404 Z M 1250 1201 L 1370 1200 L 1373 1203 L 1373 1322 L 1371 1324 L 1367 1322 L 1250 1205 Z M 979 1200 L 981 1204 L 861 1324 L 859 1324 L 858 1202 L 861 1200 Z M 1371 968 L 1373 970 L 1373 1090 L 1371 1092 L 1251 1092 L 1249 1090 Z M 860 968 L 982 1090 L 980 1092 L 860 1092 L 858 1090 L 858 970 Z M 938 890 L 1292 889 L 1293 892 L 1115 1069 L 938 892 Z M 819 543 L 819 629 L 1412 628 L 1411 542 Z M 819 290 L 820 376 L 1323 375 L 1322 289 Z M 1634 35 L 1632 87 L 1633 629 L 1720 628 L 1720 190 L 1722 188 L 2164 629 L 2225 629 L 2226 36 L 2139 36 L 2139 475 L 2136 477 L 1695 36 Z M 819 36 L 820 123 L 1412 122 L 1411 35 Z M 5 35 L 5 123 L 445 123 L 446 126 L 4 568 L 4 628 L 598 629 L 597 542 L 159 542 L 157 540 L 598 98 L 598 36 Z\"/>\n<path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 5 35 L 5 123 L 445 123 L 446 126 L 4 568 L 4 628 L 598 629 L 597 542 L 159 542 L 157 540 L 598 98 L 598 36 Z\" style=\"--trace-start:400.000000ms;--trace-duration:119.363846ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 819 36 L 820 123 L 1412 122 L 1411 35 Z\" style=\"--trace-start:519.363846ms;--trace-duration:44.809852ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 819 290 L 820 376 L 1323 375 L 1322 289 Z\" style=\"--trace-start:564.173698ms;--trace-duration:38.870474ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 819 543 L 819 629 L 1412 628 L 1411 542 Z\" style=\"--trace-start:603.044172ms;--trace-duration:44.776668ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 1634 35 L 1632 87 L 1633 629 L 1720 628 L 1720 190 L 1722 188 L 2164 629 L 2225 629 L 2226 36 L 2139 36 L 2139 475 L 2136 477 L 1695 36 Z\" style=\"--trace-start:647.820839ms;--trace-duration:119.267357ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 7 849 L 4 851 L 4 1442 L 91 1443 L 92 851 L 89 849 Z\" style=\"--trace-start:767.088196ms;--trace-duration:44.849597ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 512 850 L 511 1442 L 598 1443 L 598 850 Z\" style=\"--trace-start:811.937793ms;--trace-duration:44.809634ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 259 939 L 258 1442 L 344 1443 L 345 940 Z\" style=\"--trace-start:856.747427ms;--trace-duration:38.870474ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 751 781 L 750 1511 L 1479 1512 L 1481 1510 L 1481 782 Z\" style=\"--trace-start:895.617901ms;--trace-duration:96.344551ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 938 890 L 1292 889 L 1293 892 L 1115 1069 L 938 892 Z\" style=\"--trace-start:991.962452ms;--trace-duration:28.393708ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 860 968 L 982 1090 L 980 1092 L 860 1092 L 858 1090 L 858 970 Z\" style=\"--trace-start:1020.356160ms;--trace-duration:13.892217ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 1371 968 L 1373 970 L 1373 1090 L 1371 1092 L 1251 1092 L 1249 1090 Z\" style=\"--trace-start:1034.248377ms;--trace-duration:13.892217ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 979 1200 L 981 1204 L 861 1324 L 859 1324 L 858 1202 L 861 1200 Z\" style=\"--trace-start:1048.140594ms;--trace-duration:13.851568ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 1250 1201 L 1370 1200 L 1373 1203 L 1373 1322 L 1371 1324 L 1367 1322 L 1250 1205 Z\" style=\"--trace-start:1061.992162ms;--trace-duration:13.858924ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 937 1402 L 1114 1224 L 1119 1226 L 1293 1400 L 1291 1404 L 939 1404 Z\" style=\"--trace-start:1075.851086ms;--trace-duration:28.435924ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 1635 849 L 1632 852 L 1632 1441 L 1633 1443 L 1719 1443 L 1720 851 L 1718 849 Z\" style=\"--trace-start:1104.287010ms;--trace-duration:44.852576ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 1886 850 L 1886 1353 L 1971 1354 L 1973 1352 L 1973 851 Z\" style=\"--trace-start:1149.139585ms;--trace-duration:38.897743ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 2139 850 L 2139 1442 L 2226 1443 L 2227 852 L 2226 850 Z\" style=\"--trace-start:1188.037329ms;--trace-duration:44.850420ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 598 1664 L 511 1664 L 510 2104 L 507 2104 L 67 1664 L 6 1664 L 4 1698 L 4 2256 L 92 2256 L 92 1817 L 95 1816 L 536 2257 L 597 2257 Z\" style=\"--trace-start:1232.887749ms;--trace-duration:119.221596ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 819 1664 L 819 1750 L 821 1751 L 1412 1750 L 1412 1664 L 1410 1663 Z\" style=\"--trace-start:1352.109346ms;--trace-duration:44.825051ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 908 1918 L 908 2003 L 910 2004 L 1412 2003 L 1412 1917 Z\" style=\"--trace-start:1396.934397ms;--trace-duration:38.910876ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 819 2171 L 819 2257 L 1412 2256 L 1411 2170 Z\" style=\"--trace-start:1435.845273ms;--trace-duration:44.776668ms\"/><path class=\"studio-logo-line\" pathLength=\"1\" d=\"M 1634 1663 L 1632 1665 L 1632 1749 L 1634 1751 L 2072 1751 L 2074 1753 L 1633 2194 L 1632 2255 L 1634 2257 L 1680 2258 L 2225 2258 L 2227 2255 L 2226 2170 L 1787 2170 L 1785 2167 L 2226 1726 L 2226 1664 Z\" style=\"--trace-start:1480.621941ms;--trace-duration:119.378059ms\"/>\n</g></svg>";
    overlay = template.content.firstElementChild;
    const group = overlay.querySelector('g');
    const paths = [...group.querySelectorAll('.studio-logo-line')];
    if (name === 'original') {
      paths.forEach(path => {
        path.style.setProperty('--draw-delay', path.style.getPropertyValue('--trace-start'));
        path.style.setProperty('--draw-duration', path.style.getPropertyValue('--trace-duration'));
      });
    } else {
      overlay.querySelector('.studio-logo-guide').remove();
      const ordered = name === 'reverse-trace' ? [...paths].reverse() : paths;
      const lengths = ordered.map(path => path.getTotalLength());
      const total = lengths.reduce((a,b) => a+b,0);
      let cursor = 200;
      ordered.forEach((path,i) => {
        let delay = cursor;
        let drawing = lengths[i] / total * (duration - 1250);
        cursor += drawing;
        if (name === 'dual-reveal') {
          const coordinates = path.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
          const xs = coordinates.filter((_,j) => j % 2 === 0);
          const distanceFromEdge = Math.min(Math.min(...xs),2232-Math.max(...xs));
          delay = 200 + Math.max(0,distanceFromEdge) / 1116 * 1600;
          drawing = 850;
        }
        if (name === 'soft-reveal') { delay = 100; drawing = 1800; }
        path.removeAttribute('style');
        path.style.setProperty('--draw-delay',`${delay}ms`);
        path.style.setProperty('--draw-duration',`${drawing}ms`);
        if (name !== 'soft-reveal') {
          const fill = path.cloneNode(false);
          fill.setAttribute('class','studio-logo-fill');
          fill.setAttribute('fill','#C5A059');
          fill.setAttribute('stroke','none');
          fill.style.setProperty('--fill-delay',`${delay+drawing}ms`);
          group.insertBefore(fill,paths[0]);
        }
      });
      if (name === 'dual-reveal') paths.forEach(path => {
        const opposite = path.cloneNode(false);
        opposite.style.animationName = 'studio-logo-draw-reverse';
        group.append(opposite);
      });
    }
    const play = () => {
      if (started) return;
      started = true;
      try {
        if (reduced.matches || document.hidden || !image.naturalWidth) { settle(); return; }
        stage.append(overlay);
        // Finite CSS restores the base even if JS cleanup is interrupted.
        timer = setTimeout(settle,duration+150);
        stage.dataset.studioLogoState = 'playing';
        // Explicit preview URL only: inspect a reproducible point on the shared clock.
        const frame = new URLSearchParams(location.search).get('xen-studio-frame');
        if (/^[1-5]$/.test(forced || '') && frame !== null && /^(0(?:\.\d+)?|1(?:\.0+)?)$/.test(frame)) {
          void stage.offsetWidth;
          stage.getAnimations({subtree:true}).forEach(animation => {
            animation.pause(); animation.currentTime = Number(frame) * duration;
          });
          clearTimeout(timer);
          stage.dataset.studioLogoPreview = frame;
        }
      } catch (_) { settle(); }
    };
    const ready = () => {
      if (image.complete) play();
      else {
        image.addEventListener('load',play,{once:true});
        image.addEventListener('error',settle,{once:true});
      }
    };
    document.addEventListener('visibilitychange',() => { if(document.hidden) settle(); });
    addEventListener('pagehide',settle);
    if (reduced.addEventListener) reduced.addEventListener('change',settle);
    else if (reduced.addListener) reduced.addListener(settle);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready,{once:true});
    else ready();
  } catch (_) { settle(); }
})();
