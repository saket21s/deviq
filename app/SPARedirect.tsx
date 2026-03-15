"use client";
import { useEffect } from "react";

export default function SPARedirect() {
  useEffect(() => {
    // GitHub Pages SPA redirect handler
    const l = window.location;
    if (l.search[1] === '/') {
      const decoded = l.search.slice(1).split('&').map((s) => 
        s.replace(/~and~/g, '&')
      ).join('?');
      window.history.replaceState(null, '', l.pathname.slice(0, -1) + decoded + l.hash);
    }
  }, []);

  return null;
}
