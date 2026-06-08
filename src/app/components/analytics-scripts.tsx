import Script from "next/script";

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const googleAnalyticsId = "G-6S03SVZEJD";
const googleAdsId = "AW-18222060091";
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export function AnalyticsScripts() {
  const gtagIds = Array.from(new Set([gaMeasurementId, googleAnalyticsId, googleAdsId].filter(Boolean)));

  return (
    <>
      {gtagIds.length > 0 ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`} strategy="afterInteractive" />
          <Script id="dailycall-gtag" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              ${gtagIds.map((id) => `gtag('config', '${id}');`).join("\n              ")}
            `}
          </Script>
        </>
      ) : null}
      {clarityProjectId ? (
        <Script id="dailycall-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityProjectId}");
          `}
        </Script>
      ) : null}
    </>
  );
}
