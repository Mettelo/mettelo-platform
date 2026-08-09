import Script from 'next/script';

export default function Analytics(){
  const measurementId=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if(!measurementId) return null;

  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
    <Script id="mettelo-analytics" strategy="afterInteractive">{`
      window.dataLayer=window.dataLayer||[];
      function gtag(){dataLayer.push(arguments)}
      window.gtag=gtag;
      gtag('js',new Date());
      gtag('config','${measurementId}',{anonymize_ip:true});
      document.addEventListener('click',function(e){
        var el=e.target&&e.target.closest?e.target.closest('a,button'):null;
        if(!el)return;
        var href=el.getAttribute('href')||'';
        var text=(el.textContent||'').trim().slice(0,80);
        var eventName=el.getAttribute('data-event');
        if(!eventName){
          if(href.indexOf('/join')===0||href.indexOf('/signin')===0||href.indexOf('/membership')===0)eventName='membership_intent';
          else if(href.indexOf('/projects')===0)eventName='project_intent';
          else if(href.indexOf('/partnership')===0)eventName='partner_intent';
          else if(href.indexOf('/events')===0)eventName='event_intent';
        }
        if(eventName)gtag('event',eventName,{link_url:href,link_text:text});
      });
    `}</Script>
  </>;
}
