import{S as K,i as L,s as U,e as p,k as E,N as W,c as m,d as h,n as M,a as v,b as f,F as u,f as k,G as O,t as C,g as N,D as Y,h as z,Q as F,P as H,l as J,R as X}from"../chunks/vendor-052015e0.js";function Q(c,t,l){const e=c.slice();return e[2]=t[l].slug,e[3]=t[l].title,e[4]=t[l].date,e[5]=t[l].topic,e[6]=t[l].thumbnail,e}function Z(c){let t;return{c(){t=p("span"),this.h()},l(l){t=m(l,"SPAN",{class:!0}),v(t).forEach(h),this.h()},h(){f(t,"class","loader svelte-sj4va9")},m(l,e){k(l,t,e)},p:O,d(l){l&&h(t)}}}function x(c){let t,l=c[0],e=[];for(let a=0;a<l.length;a+=1)e[a]=w(Q(c,l,a));return{c(){for(let a=0;a<e.length;a+=1)e[a].c();t=J()},l(a){for(let s=0;s<e.length;s+=1)e[s].l(a);t=J()},m(a,s){for(let r=0;r<e.length;r+=1)e[r].m(a,s);k(a,t,s)},p(a,s){if(s&1){l=a[0];let r;for(r=0;r<l.length;r+=1){const n=Q(a,l,r);e[r]?e[r].p(n,s):(e[r]=w(n),e[r].c(),e[r].m(t.parentNode,t))}for(;r<e.length;r+=1)e[r].d(1);e.length=l.length}},d(a){X(e,a),a&&h(t)}}}function R(c){let t,l,e;return{c(){t=p("img"),this.h()},l(a){t=m(a,"IMG",{src:!0,alt:!0,class:!0}),this.h()},h(){H(t.src,l=c[6].url)||f(t,"src",l),f(t,"alt",e=c[6].alt),f(t,"class","svelte-sj4va9")},m(a,s){k(a,t,s)},p(a,s){s&1&&!H(t.src,l=a[6].url)&&f(t,"src",l),s&1&&e!==(e=a[6].alt)&&f(t,"alt",e)},d(a){a&&h(t)}}}function w(c){let t,l,e,a,s=c[3]+"",r,n,o,b,j=c[5]+"",D,P,g,A=F(c[4]).format("DD MMM YYYY")+"",$,T,S,I,i=c[6]&&R(c);return{c(){t=p("section"),l=p("a"),e=p("div"),a=p("h1"),r=C(s),n=E(),o=p("p"),b=C("Category: "),D=C(j),P=E(),g=p("p"),$=C(A),T=E(),i&&i.c(),I=E(),this.h()},l(_){t=m(_,"SECTION",{class:!0});var d=v(t);l=m(d,"A",{class:!0,href:!0});var q=v(l);e=m(q,"DIV",{style:!0});var y=v(e);a=m(y,"H1",{class:!0});var G=v(a);r=N(G,s),G.forEach(h),n=M(y),o=m(y,"P",{style:!0,class:!0});var B=v(o);b=N(B,"Category: "),D=N(B,j),B.forEach(h),P=M(y),g=m(y,"P",{style:!0,class:!0});var V=v(g);$=N(V,A),V.forEach(h),y.forEach(h),T=M(q),i&&i.l(q),q.forEach(h),I=M(d),d.forEach(h),this.h()},h(){f(a,"class","title svelte-sj4va9"),Y(o,"margin","0"),f(o,"class","svelte-sj4va9"),Y(g,"margin","0"),f(g,"class","svelte-sj4va9"),Y(e,"display","flex"),Y(e,"flex-direction","column"),Y(e,"align-items","flex-start"),f(l,"class","blog_link svelte-sj4va9"),f(l,"href",S=`/blog/${c[2]}`),f(t,"class","individual svelte-sj4va9")},m(_,d){k(_,t,d),u(t,l),u(l,e),u(e,a),u(a,r),u(e,n),u(e,o),u(o,b),u(o,D),u(e,P),u(e,g),u(g,$),u(l,T),i&&i.m(l,null),u(t,I)},p(_,d){d&1&&s!==(s=_[3]+"")&&z(r,s),d&1&&j!==(j=_[5]+"")&&z(D,j),d&1&&A!==(A=F(_[4]).format("DD MMM YYYY")+"")&&z($,A),_[6]?i?i.p(_,d):(i=R(_),i.c(),i.m(l,null)):i&&(i.d(1),i=null),d&1&&S!==(S=`/blog/${_[2]}`)&&f(l,"href",S)},d(_){_&&h(t),i&&i.d()}}}function ee(c){let t,l,e;function a(n,o){return n[0]?x:Z}let s=a(c),r=s(c);return{c(){t=p("meta"),l=E(),e=p("div"),r.c(),this.h()},l(n){const o=W('[data-svelte="svelte-aakrzg"]',document.head);t=m(o,"META",{name:!0,content:!0}),o.forEach(h),l=M(n),e=m(n,"DIV",{});var b=v(e);r.l(b),b.forEach(h),this.h()},h(){document.title="Blog | Masaya's Thoughts",f(t,"name","description"),f(t,"content","Articles by Masaya")},m(n,o){u(document.head,t),k(n,l,o),k(n,e,o),r.m(e,null)},p(n,[o]){s===(s=a(n))&&r?r.p(n,o):(r.d(1),r=s(n),r&&(r.c(),r.m(e,null)))},i:O,o:O,d(n){h(t),n&&h(l),n&&h(e),r.d()}}}const te="fe98495b378ae369d79dea240fba61";function le(c,t,l){let e;function a(s){l(0,e=s)}return fetch("https://graphql.datocms.com/",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:`Bearer ${te}`},body:JSON.stringify({query:`
        {
            allArticles {
                id
                active
                title
                slug
                khmer
                topic
                date
                thumbnail {
                    alt
                    url
                }
                createdAt
                updatedAt
            }
        }
        `})}).then(s=>s.json()).then(s=>{a(s.data.allArticles)}).catch(s=>{console.log(s)}),[e]}class se extends K{constructor(t){super();L(this,t,le,ee,U,{})}}export{se as default};