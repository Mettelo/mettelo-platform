import Script from 'next/script';

export default function Analytics(){
  const measurementId=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return <>
    <Script id="mettelo-public-experience" strategy="afterInteractive">{`
      (function(){
        function normalizePublicExperience(){
          document.querySelectorAll('a[href="/join"],a[href^="/join?"]').forEach(function(link){link.setAttribute('href','/auth/signup')});
          if(!document.body.classList.contains('authSignedIn')){
            document.querySelectorAll('a[href="/project-architect"]').forEach(function(link){link.remove()});
          }
          document.querySelectorAll('[data-qa],.qaOnly,[class*="qa-only" i]').forEach(function(node){node.remove()});
          var footerColumns=document.querySelectorAll('footer .footerLinksColumn');
          if(footerColumns.length){
            var last=footerColumns[footerColumns.length-1];
            if(!last.querySelector('a[href="/faq"]')){
              var faq=document.createElement('a');faq.href='/faq';faq.textContent='FAQ';last.appendChild(faq);
            }
          }
        }
        normalizePublicExperience();
        new MutationObserver(normalizePublicExperience).observe(document.documentElement,{childList:true,subtree:true});
      })();
    `}</Script>
    {measurementId&&<>
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
            if(href.indexOf('/auth/signup')===0||href.indexOf('/signin')===0||href.indexOf('/membership')===0)eventName='membership_intent';
            else if(href.indexOf('/projects')===0)eventName='project_intent';
            else if(href.indexOf('/partnership')===0)eventName='partner_intent';
            else if(href.indexOf('/events')===0)eventName='event_intent';
          }
          if(eventName)gtag('event',eventName,{link_url:href,link_text:text});
        });
      `}</Script>
    </>}
  </>;
}
