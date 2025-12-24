import{c as h,a as u,d as r,q as f,o as c,b as w,f as d,s as l,e as p,u as b,h as v,j as g}from"./index-BsqyUQ-T.js";const T=[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]],I=h("message-square",T),A=[{value:"initial_contact",label:"Initial Contact"},{value:"follow_up",label:"Follow Up"},{value:"interview_invite",label:"Interview Invitation"},{value:"interview_reminder",label:"Interview Reminder"},{value:"trial_invite",label:"Trial Invitation"},{value:"trial_reminder",label:"Trial Reminder"},{value:"offer",label:"Job Offer"},{value:"rejection",label:"Rejection"},{value:"general",label:"General"}],x=[{key:"firstName",label:"First Name",example:"John"},{key:"lastName",label:"Last Name",example:"Smith"},{key:"fullName",label:"Full Name",example:"John Smith"},{key:"jobTitle",label:"Job Title",example:"Dispenser"},{key:"companyName",label:"Company Name",example:"Allied Pharmacies"},{key:"interviewDate",label:"Interview Date",example:"15th January"},{key:"interviewTime",label:"Interview Time",example:"10:00 AM"},{key:"branchAddress",label:"Branch Address",example:"123 High Street, Manchester"},{key:"contactName",label:"Contact Name",example:"Sarah Johnson"},{key:"contactPhone",label:"Contact Phone",example:"07123 456789"}],N=[{name:"Initial Contact",category:"initial_contact",content:`Hi {{firstName}},

Thank you for your application for the {{jobTitle}} position at {{companyName}}.

We've reviewed your CV and would like to discuss this opportunity with you. Are you available for a quick call this week?

Best regards`,isDefault:!0},{name:"Follow Up - No Response",category:"follow_up",content:`Hi {{firstName}},

I wanted to follow up on my previous message regarding the {{jobTitle}} position at {{companyName}}.

Are you still interested in this opportunity? Please let me know if you'd like to discuss further.

Thanks`,isDefault:!0},{name:"Interview Invitation",category:"interview_invite",content:`Hi {{firstName}},

Great news! We'd like to invite you for an interview for the {{jobTitle}} position.

📅 Date: {{interviewDate}}
⏰ Time: {{interviewTime}}
📍 Location: {{branchAddress}}

Please confirm if this works for you. If not, let me know your availability and we can arrange an alternative.

Looking forward to meeting you!`,isDefault:!0},{name:"Interview Reminder",category:"interview_reminder",content:`Hi {{firstName}},

Just a friendly reminder about your interview tomorrow:

📅 Date: {{interviewDate}}
⏰ Time: {{interviewTime}}
📍 Location: {{branchAddress}}

Please bring a form of ID with you. If you have any questions or need to reschedule, please let me know ASAP.

See you soon!`,isDefault:!0},{name:"Trial Day Invitation",category:"trial_invite",content:`Hi {{firstName}},

Following your successful interview, we'd like to invite you for a trial day as a {{jobTitle}}.

📅 Date: {{interviewDate}}
⏰ Time: {{interviewTime}}
📍 Location: {{branchAddress}}

Please wear smart casual attire and bring ID. You'll be working alongside our team to get a feel for the role.

Please confirm your attendance.`,isDefault:!0},{name:"Availability Check",category:"general",content:`Hi {{firstName}},

We have an opening for a {{jobTitle}} position that might interest you.

Could you let me know your current availability and if you'd be interested in discussing this opportunity?

Thanks`,isDefault:!0}],s="whatsappTemplates";async function P(e,t){const a=u(r,s),n={name:e.name,category:e.category,content:e.content,placeholders:m(e.content),isDefault:!1,createdBy:t,createdAt:l(),updatedAt:l()};return{id:(await d(a,n)).id,...n}}async function k(){const e=u(r,s),t=f(e,c("category"),c("name"));return(await g(t)).docs.map(n=>({id:n.id,...n.data()}))}function R(e){const t=u(r,s),a=f(t,c("category"),c("name"));return w(a,n=>{const o=n.docs.map(i=>({id:i.id,...i.data()}));e(o)},n=>{console.error("Error subscribing to templates:",n)})}async function L(e,t){const a=p(r,s,e),n={...t,placeholders:m(t.content||""),updatedAt:l()};return await b(a,n),{id:e,...n}}async function _(e){const t=p(r,s,e);await v(t)}async function E(e){const t=await k();if(t.length>0)return t;const a=u(r,s),n=[];for(const o of N){const i={...o,placeholders:m(o.content),createdBy:e,createdAt:l(),updatedAt:l()},y=await d(a,i);n.push({id:y.id,...i})}return n}function m(e){const t=/\{\{(\w+)\}\}/g,a=[];let n;for(;(n=t.exec(e))!==null;)a.includes(n[1])||a.push(n[1]);return a}function C(e,t){let a=e;for(const[n,o]of Object.entries(t)){const i=new RegExp(`\\{\\{${n}\\}\\}`,"g");a=a.replace(i,o||"")}return a}function j(e,t={}){return{firstName:e.firstName||"",lastName:e.lastName||"",fullName:`${e.firstName||""} ${e.lastName||""}`.trim(),jobTitle:e.jobTitle||"",companyName:"Allied Pharmacies",interviewDate:t.interviewDate||"",interviewTime:t.interviewTime||"",branchAddress:t.branchAddress||"",contactName:t.contactName||"",contactPhone:t.contactPhone||"",...t}}function S(e,t){let a=e.replace(/\D/g,"");a.startsWith("0")?a="44"+a.substring(1):!a.startsWith("44")&&a.length===10&&(a="44"+a);const n=encodeURIComponent(t);return`https://wa.me/${a}?text=${n}`}function H(e){return A.find(a=>a.value===e)?.label||e}export{x as A,I as M,A as T,S as a,j as b,E as c,P as d,_ as e,C as f,H as g,R as s,L as u};
