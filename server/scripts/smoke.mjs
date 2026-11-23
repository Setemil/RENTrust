// End-to-end check of every API feature: sign-up, checks, properties, moderation, marketplace,
// interests, notifications and admin. Run it with `npm run smoke` (see smoke.sh), which gives it
// a fresh throwaway database. When you add a feature, add its checks at the bottom.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
// A fake Termii (smoke.sh points TERMII_BASE_URL here). It keeps every message it is asked to send;
// set termiiFails to make it refuse the next one the way Termii does.
const termii=[]; let termiiFails=false;
const fakeTermii=createServer((req,res)=>{let s='';req.on('data',d=>s+=d).on('end',()=>{const body=JSON.parse(s||'{}');termii.push({path:req.url,body});res.setHeader('content-type','application/json');if(termiiFails){termiiFails=false;res.statusCode=400;return res.end(JSON.stringify({message:'Insufficient balance'}));}res.end(JSON.stringify({code:'ok',message_id_str:'smoke-'+termii.length,balance:100}));});}).listen(5098);
const termiiCode=()=>{const m=termii.at(-1)?.body;return m?.data?.otp??m?.sms?.match(/\d{6}/)?.[0];};
const B = process.env.SMOKE_URL ?? 'http://localhost:5097/api/v1';
let fails=0;
async function call(path,{method='GET',body,token}={}){const r=await fetch(B+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body&&JSON.stringify(body)});return {status:r.status,data:await r.json().catch(()=>null)};}
function ok(name,cond,extra=''){ if(!cond) fails++; console.log((cond?'PASS ':'FAIL ')+name+(cond?'':' '+JSON.stringify(extra))); }
const login=async e=>(await call('/auth/login',{method:'POST',body:{email:e,password:'rentrust-test'}})).data.token;
const admin=await login('admin@rentrust.test'), landlord=await login('landlord@rentrust.test'), renter=await login('renter@rentrust.test');
ok('logins', admin&&landlord&&renter);
let r=await call('/health'); ok('health',r.status===200);
r=await call('/listings'); ok('marketplace needs auth',r.status===401&&r.data.error.code==='UNAUTHENTICATED',r);
r=await call('/admin/overview',{token:renter}); ok('admin forbidden to renter',r.status===403,r);
r=await call('/properties',{token:renter}); ok('properties forbidden to renter',r.status===403,r);
// sign-up journey
const email=`smoke${Date.now()}@example.test`;
r=await call('/auth/register',{method:'POST',body:{email,phone:'0809'+String(Date.now()).slice(-7),password:'password123',role:'SEEKER',profile:{firstName:'Sam',lastName:'Smoke',junk:'x'}}}); ok('register',r.status===201&&!('junk' in r.data.user.profile),r);
const nu=r.data.token;
r=await call('/auth/register',{method:'POST',body:{email,phone:'08011111111',password:'password123'}}); ok('duplicate register 409',r.status===409,r);
r=await call('/auth/register',{method:'POST',body:{email:'a@b.co',phone:'08022222222',password:'short'}}); ok('short password 400',r.status===400,r);
r=await call('/auth/me',{token:nu}); ok('me',r.status===200&&r.data.user.roles[0]==='SEEKER'&&!r.data.user.passwordHash,r);
for(const channel of ['EMAIL','PHONE']){ r=await call('/account/otp/send',{method:'POST',token:nu,body:{channel}}); const code=channel==='PHONE'?termiiCode():r.data.testCode; let w=await call('/account/otp/verify',{method:'POST',token:nu,body:{channel,code:'000000'===code?'111111':'000000'}}); ok('wrong otp '+channel,w.status===400,w); r=await call('/account/otp/verify',{method:'POST',token:nu,body:{channel,code}}); ok('otp '+channel,r.status===200,r); }
r=await call('/account/verification',{method:'POST',token:nu,body:{idType:'NIN',idNumber:'12345678901',dateOfBirth:'1990-05-01'}}); ok('verification before consents 400',r.status===400,r);
r=await call('/account/consents',{method:'POST',token:nu,body:{kinds:['TERMS_OF_SERVICE','PRIVACY_POLICY']}}); ok('consents',r.status===201,r);
r=await call('/account/status',{token:nu}); ok('terms accepted at version 2.1',r.data.termsAccepted&&r.data.consentVersion==='2.1'&&r.data.termsAcceptedVersion==='2.1',r.data);
r=await call('/admin/audit?entityType=User',{token:admin}); ok('accepting terms is audited',r.data.entries.some(e=>e.action==='user.consents_accepted'&&e.after?.docVersion==='2.1'),r.data.entries?.slice(0,3));
r=await call('/account/status',{token:renter}); ok('seeded accounts accepted the current version',r.data.termsAccepted===true,r.data);
r=await call('/account/verification',{method:'POST',token:nu,body:{idType:'NIN',idNumber:'12345678901',dateOfBirth:'2015-05-01'}}); ok('under 18 rejected',r.status===400,r);
r=await call('/account/verification',{method:'POST',token:nu,body:{idType:'NIN',idNumber:'12345678901',dateOfBirth:'1990-05-01'}}); ok('verification submitted',r.status===201,r);
r=await call('/account/status',{token:nu}); ok('status pending + masked id',r.data.kycStatus==='PENDING'&&r.data.verification.data.idNumber.endsWith('8901')&&r.data.verification.data.idNumber.startsWith('•')&&r.data.termsAccepted,r);
r=await call('/admin/verifications?subject=USER',{token:admin}); const v=r.data.verifications.find(x=>x.submittedBy.email===email); ok('admin sees check',!!v,r);
r=await call('/admin/verifications/'+v.id,{method:'PATCH',token:admin,body:{decision:'REJECT'}}); ok('reject needs note',r.status===400,r);
r=await call('/admin/verifications/'+v.id,{method:'PATCH',token:admin,body:{decision:'APPROVE'}}); ok('approve check',r.status===200,r);
r=await call('/auth/me',{token:nu}); ok('now verified',r.data.user.kycStatus==='VERIFIED',r);
// landlord property journey
const prop={property:{type:'RESIDENTIAL',title:'Smoke flat',state:'Lagos',lga:'Ikeja',area:'GRA',address:'1 Smoke St',bedrooms:2,bathrooms:1,furnishing:'UNFURNISHED',amenities:['Water']},listing:{rentAmount:1500000,rentPeriod:'YEAR',otherCharges:[{label:'Legal',amount:1000}]},terms:{permittedUse:'Residential',pets:'ASK',smoking:'NOT_ALLOWED',paymentFrequency:'YEARLY',additional:['Be nice']}};
r=await call('/properties',{method:'POST',token:landlord,body:prop}); ok('create property',r.status===201&&r.data.property.listing.status==='DRAFT'&&r.data.property.listing.ref.startsWith('RT-'),r);
const pid=r.data.property.id, lid=r.data.property.listing.id;
r=await call('/properties/'+pid,{method:'PATCH',token:landlord,body:{...prop,property:{...prop.property,title:'Smoke flat 2'}}}); ok('update property',r.status===200&&r.data.property.title==='Smoke flat 2',r);
r=await call('/properties/'+pid+'/terms',{method:'PUT',token:landlord,body:{...prop.terms,pets:'ALLOWED'}}); ok('terms v2',r.status===200&&r.data.property.listing.terms[0].version===2,r);
r=await call('/properties/'+pid,{token:nu}); ok('property hidden from renter',r.status===403,r);
r=await call('/properties/'+pid+'/submit',{method:'POST',token:landlord,body:{}}); ok('submit needs evidence',r.status===400,r);
r=await call('/properties/'+pid+'/submit',{method:'POST',token:landlord,body:{documentType:'CERTIFICATE_OF_OCCUPANCY',reference:'C of O 1'}}); ok('submit',r.status===200&&r.data.property.listing.status==='PENDING_REVIEW'&&r.data.property.verification.status==='PENDING',r);
r=await call('/admin/listings/'+lid,{method:'PATCH',token:admin,body:{action:'APPROVE'}}); ok('approve blocked until docs verified',r.status===409,r);
r=await call('/admin/verifications?subject=PROPERTY',{token:admin}); const pv=r.data.verifications.find(x=>x.property?.id===pid);
r=await call('/admin/verifications/'+pv.id,{method:'PATCH',token:admin,body:{decision:'APPROVE'}}); ok('approve property docs',r.status===200,r);
r=await call('/admin/listings/'+lid,{method:'PATCH',token:admin,body:{action:'REJECT'}}); ok('reject needs note',r.status===400,r);
r=await call('/admin/listings/'+lid,{method:'PATCH',token:admin,body:{action:'APPROVE'}}); ok('approve listing',r.status===200,r);
r=await call('/properties/'+pid,{token:landlord}); ok('listing live + published',r.data.property.listing.status==='LIVE'&&r.data.property.listing.publishedAt&&r.data.property.listing.reviewNote===null,r);
r=await call('/properties/'+pid+'/availability',{method:'POST',token:landlord,body:{action:'RESUME'}}); ok('resume when live 409',r.status===409,r);
r=await call('/properties/'+pid+'/availability',{method:'POST',token:landlord,body:{action:'PAUSE'}}); ok('pause',r.data.property?.listing.status==='PAUSED',r);
r=await call('/listings/'+lid,{token:nu}); ok('paused hidden from renters',r.status===404,r);
r=await call('/properties/'+pid+'/availability',{method:'POST',token:landlord,body:{action:'RESUME'}}); ok('resume',r.data.property?.listing.status==='LIVE',r);
r=await call('/admin/listings/'+lid,{method:'PATCH',token:admin,body:{action:'SUSPEND',note:'checking'}}); ok('suspend',r.status===200,r);
r=await call('/admin/listings/'+lid,{method:'PATCH',token:admin,body:{action:'REINSTATE'}}); ok('reinstate',r.status===200,r);
// marketplace + interest with the new renter
r=await call('/listings?q=smoke&sort=rent_asc',{token:nu}); ok('search',r.status===200&&r.data.listings.length===1&&r.data.listings[0].property.address==='1 Smoke St',r);
r=await call('/listings/'+lid+'/save',{method:'POST',token:nu}); ok('save',r.data.saved===true,r);
r=await call('/listings?saved=1',{token:nu}); ok('saved filter',r.data.listings.length===1,r);
r=await call('/listings/'+lid+'/save',{method:'DELETE',token:nu}); ok('unsave',r.data.saved===false,r);
r=await call('/interests',{method:'POST',token:nu,body:{listingId:lid,consentCharacterReport:true}}); ok('interest needs terms',r.status===403,r);
r=await call('/listings/'+lid,{token:nu}); const tid=r.data.listing.terms.id;
r=await call('/listings/'+lid+'/terms/accept',{method:'POST',token:nu,body:{termsId:tid}}); ok('accept terms',r.status===200&&r.data.version===2,r);
r=await call('/interests',{method:'POST',token:landlord,body:{listingId:lid,consentCharacterReport:true}}); ok('landlord cannot show interest',r.status===403,r);
r=await call('/interests',{method:'POST',token:nu,body:{listingId:lid,consentCharacterReport:true,message:'Hi'}}); ok('show interest',r.status===201&&r.data.interest.status==='REPORT_REQUESTED',r);
const iid=r.data.interest.id;
r=await call('/interests',{method:'POST',token:nu,body:{listingId:lid,consentCharacterReport:true}}); ok('duplicate interest 409',r.status===409,r);
r=await call('/interests/'+iid+'/decision',{method:'PATCH',token:landlord,body:{decision:'APPROVE'}}); ok('decide before report 409',r.status===409,r);
await new Promise(x=>setTimeout(x,1500));
r=await call('/interests/'+iid+'/report',{token:renter}); ok('report hidden from other renter',r.status===403,r);
r=await call('/interests/'+iid+'/report',{token:nu}); ok('report hidden from the renter themself',r.status===403,r);
r=await call('/interests/'+iid,{token:renter}); ok('interest hidden from other renter',r.status===403,r);
r=await call('/interests/'+iid+'/report',{token:landlord}); ok('landlord opens report',r.status===200&&r.data.report.payload.name==='Sam Smoke'&&r.data.accessLog.length===1,r);
r=await call('/interests/received',{token:landlord}); ok('received list',r.data.interests.some(x=>x.id===iid&&x.status==='AWAITING_DECISION'),r);
const [a,w]=await Promise.all([call('/interests/'+iid+'/decision',{method:'PATCH',token:landlord,body:{decision:'REJECT',reason:'internal reason'}}),call('/interests/'+iid+'/withdraw',{method:'POST',token:nu})]);
ok('race: exactly one wins',[a.status,w.status].sort().join()==='200,409',[a,w]);
r=await call('/interests/'+iid,{token:nu}); ok('renter view hides reason, has timeline',r.data.view==='seeker'&&!('decisionReason' in r.data.interest)&&r.data.interest.history.length===7&&r.data.interest.history[0].status==='INITIATED',r);
r=await call('/interests/mine',{token:nu}); ok('my interests',r.data.interests.length===1,r);
r=await call('/notifications',{token:landlord}); ok('landlord notifications',r.status===200&&r.data.unread>0&&r.data.notifications.some(n=>n.event==='report.ready'&&n.alsoSent.length===2),r);
const nid=r.data.notifications[0].id;
r=await call('/notifications/'+nid+'/read',{method:'POST',token:landlord}); r=await call('/notifications/read-all',{method:'POST',token:landlord}); r=await call('/notifications/unread-count',{token:landlord}); ok('mark read',r.data.unread===0,r);
r=await call('/admin/overview',{token:admin}); ok('admin overview',r.status===200&&r.data.live>=1,r);
r=await call('/admin/interests',{token:admin}); ok('admin interests',r.data.interests.some(x=>x.id===iid),r);
r=await call('/admin/audit',{token:admin}); ok('admin audit with request ids',r.data.entries.length>10&&r.data.entries.every(e=>e.requestId&&typeof e.seq==='string'),r.data.entries?.[0]);
r=await call('/admin/users?q=smoke',{token:admin}); const u=r.data.users[0]; ok('admin user search',u?.email===email,r);
r=await call('/admin/users/'+u.id,{method:'PATCH',token:admin,body:{status:'SUSPENDED'}}); ok('suspend user',r.status===200,r);
r=await call('/auth/me',{token:nu}); ok('suspended token rejected',r.status===401&&r.data.error.code==='ACCOUNT_INACTIVE',r);
r=await call('/auth/login',{method:'POST',body:{email,password:'password123'}}); ok('suspended login 403',r.status===403&&r.data.error.code==='ACCOUNT_SUSPENDED',r);
r=await call('/auth/password',{method:'PATCH',token:renter,body:{currentPassword:'nope',newPassword:'whatever123'}}); ok('wrong current password',r.status===401,r);
r=await call('/listings/not-a-uuid',{token:renter}); ok('bad id 404',r.status===404,r);
// toasts: the server attaches one to successes it wants announced and to non-form errors
r=await call('/admin/users/'+u.id,{method:'PATCH',token:admin,body:{status:'ACTIVE'}}); ok('success carries a toast',r.data.toast?.kind==='success'&&r.data.toast.message==='Account reactivated',r);
r=await call('/admin/verifications/'+v.id,{method:'PATCH',token:admin,body:{decision:'APPROVE'}}); ok('conflict carries an error toast',r.status===409&&r.data.toast?.kind==='error'&&r.data.toast.message===r.data.error.message,r);
r=await call('/admin/users/'+u.id,{method:'PATCH',token:admin,body:{status:'NOPE'}}); ok('form errors carry no toast',r.status===400&&!r.data.toast,r);
// password reset: one-time link, same answer for unknown emails, signs out older tokens
r=await call('/auth/password/forgot',{method:'POST',body:{email:'nobody@example.test'}}); ok('forgot unknown email: same answer, no link',r.status===200&&!r.data.testLink&&r.data.message.startsWith('If an account'),r);
r=await call('/auth/password/forgot',{method:'POST',body:{email}}); const resetToken=new URL(r.data.testLink??'http://x/').searchParams.get('token'); ok('forgot sends a link',r.status===200&&!!resetToken,r);
r=await call('/auth/password/reset',{method:'POST',body:{token:'not-a-real-token',newPassword:'newpass1234'}}); ok('reset with a bad link 400',r.status===400&&r.data.error.code==='RESET_LINK_INVALID',r);
r=await call('/auth/password/reset',{method:'POST',body:{token:resetToken,newPassword:'short'}}); ok('reset needs a long password',r.status===400,r);
r=await call('/auth/me',{token:nu}); ok('old token works before reset',r.status===200,r);
r=await call('/auth/password/reset',{method:'POST',body:{token:resetToken,newPassword:'newpass1234'}}); ok('reset',r.status===200&&r.data.toast?.kind==='success',r);
r=await call('/auth/me',{token:nu}); ok('reset signs out older tokens',r.status===401&&r.data.error.code==='TOKEN_REVOKED',r);
r=await call('/auth/password/reset',{method:'POST',body:{token:resetToken,newPassword:'another1234'}}); ok('link works only once',r.status===400,r);
r=await call('/auth/login',{method:'POST',body:{email,password:'newpass1234'}}); ok('sign in with new password',r.status===200,r);
const before=r.data.token; await new Promise(x=>setTimeout(x,1100));
r=await call('/auth/password',{method:'PATCH',token:before,body:{currentPassword:'newpass1234',newPassword:'changed1234'}}); ok('change password returns a fresh token',r.status===200&&!!r.data.token,r);
const fresh=r.data.token;
r=await call('/auth/me',{token:fresh}); ok('fresh token works',r.status===200,r);
r=await call('/auth/me',{token:before}); ok('change password signs out older tokens',r.status===401&&r.data.error.code==='TOKEN_REVOKED',r);
r=await call('/admin/audit',{token:admin}); ok('password changes audited',['user.password_reset_requested','user.password_reset','user.password_changed'].every(a=>r.data.entries.some(e=>e.action===a)),r.data.entries?.slice(0,3));
// listing photos: signed direct upload to Cloudinary, checked before saving, drafts only
const cloudSign=(publicId,version)=>createHash('sha1').update(`public_id=${publicId}&version=${version}smoke-secret`).digest('hex');
r=await call('/properties',{method:'POST',token:landlord,body:{...prop,property:{...prop.property,title:'Photo flat',address:'2 Smoke St'}}}); const ppid=r.data.property.id, plid=r.data.property.listing.id; ok('draft for photos',r.status===201&&r.data.property.photosEnabled===true&&r.data.property.listing.photos.length===0,r);
r=await call('/properties/'+ppid+'/photos/upload',{method:'POST',token:landlord}); ok('upload signature',r.status===200&&r.data.uploadUrl.includes('/smoke/image/upload')&&r.data.fields.folder===`rentrust/listings/${plid}`&&!!r.data.fields.signature&&!('api_secret' in r.data.fields),r);
const pubA=`rentrust/listings/${plid}/a1`, pubB=`rentrust/listings/${plid}/b2`;
r=await call('/properties/'+ppid+'/photos',{method:'POST',token:landlord,body:{publicId:pubA,version:1700000000,signature:'0'.repeat(40)}}); ok('forged upload refused',r.status===400,r);
r=await call('/properties/'+ppid+'/photos',{method:'POST',token:landlord,body:{publicId:'rentrust/listings/other/x',version:1700000000,signature:cloudSign('rentrust/listings/other/x',1700000000)}}); ok('photo from another folder refused',r.status===400,r);
r=await call('/properties/'+ppid+'/photos',{method:'POST',token:landlord,body:{publicId:pubA,version:1700000000,signature:cloudSign(pubA,1700000000),width:1200,height:900}}); ok('photo added',r.status===200&&r.data.property.listing.photos.length===1&&r.data.property.listing.photos[0].thumb.includes('res.cloudinary.com/smoke'),r);
r=await call('/properties/'+ppid+'/photos',{method:'POST',token:landlord,body:{publicId:pubB,version:1700000001,signature:cloudSign(pubB,1700000001)}}); const photoB=r.data.property.listing.photos[1]?.id; ok('second photo',r.data.property.listing.photos.length===2,r);
r=await call('/properties/'+ppid+'/photos/'+photoB+'/cover',{method:'POST',token:landlord}); ok('make cover',r.status===200&&r.data.property.listing.photos[0].id===photoB,r);
r=await call('/properties/'+ppid+'/photos/'+photoB,{method:'DELETE',token:renter}); ok('renter cannot touch photos',r.status===403,r);
r=await call('/properties/'+ppid+'/photos/'+photoB,{method:'DELETE',token:landlord}); ok('remove photo',r.status===200&&r.data.property.listing.photos.length===1,r);
r=await call('/properties/'+pid+'/photos/upload',{method:'POST',token:landlord}); ok('live listing photos locked',r.status===409,r);
r=await call('/listings/'+lid,{token:renter}); ok('marketplace listing has photos list',Array.isArray(r.data.listing?.photos),r);
r=await call('/admin/audit',{token:admin}); ok('photo changes audited',['listing.photo_added','listing.photo_cover','listing.photo_removed'].every(a=>r.data.entries.some(e=>e.action===a)),r.data.entries?.slice(0,3));
// rate limits, body limit and security headers
for(let i=0;i<3;i++) await call('/auth/password/forgot',{method:'POST',body:{email:'limit@example.test'}});
r=await call('/auth/password/forgot',{method:'POST',body:{email:'limit@example.test'}}); ok('forgot is rate limited',r.status===429&&r.data.error.code==='RATE_LIMITED',r);
for(let i=0;i<10;i++) await call('/auth/login',{method:'POST',body:{email:'limit@example.test',password:'wrong-password'}});
r=await call('/auth/login',{method:'POST',body:{email:'limit@example.test',password:'wrong-password'}}); ok('login is rate limited per email',r.status===429,r);
r=await call('/auth/login',{method:'POST',body:{email:'admin@rentrust.test',password:'rentrust-test'}}); ok('other emails can still sign in',r.status===200,r);
r=await call('/auth/login',{method:'POST',body:{email:'x@example.test',password:'x'.repeat(200_000)}}); ok('oversized body 413',r.status===413&&r.data.error.code==='BODY_TOO_LARGE',r);
const h=await fetch(B+'/health'); ok('security headers',h.headers.get('x-content-type-options')==='nosniff'&&!h.headers.get('x-powered-by'),Object.fromEntries(h.headers));
// phone codes through Termii: WhatsApp by default, SMS on request, Termii's refusals shown
r=await call('/auth/register',{method:'POST',body:{email:'phone'+Date.now()+'@example.test',phone:'0803 123 4567',password:'password123',role:'SEEKER',profile:{firstName:'Pat',lastName:'Phone'}}}); const pu=r.data.token;
r=await call('/account/status',{token:pu}); ok('status says which phone routes work',r.data.phoneRoutes?.whatsapp===true&&r.data.phoneRoutes?.sms===true,r.data);
r=await call('/account/otp/send',{method:'POST',token:pu,body:{channel:'PHONE'}}); let sent=termii.at(-1);
ok('phone code goes by WhatsApp by default',r.status===200&&r.data.via==='WHATSAPP'&&!r.data.testCode&&sent.path==='/api/send/template',r.data);
ok('WhatsApp template request',sent.body.phone_number==='2348031234567'&&sent.body.device_id==='smoke-device'&&sent.body.template_id==='smoke-template'&&/^\d{6}$/.test(sent.body.data?.otp)&&sent.body.api_key==='smoke-termii',sent.body);
r=await call('/account/otp/send',{method:'POST',token:pu,body:{channel:'PHONE',via:'PIGEON'}}); ok('unknown phone route 400',r.status===400,r);
r=await call('/account/otp/send',{method:'POST',token:pu,body:{channel:'PHONE',via:'SMS'}}); sent=termii.at(-1);
ok('SMS on request, on the DND route',r.status===200&&r.data.via==='SMS'&&sent.path==='/api/sms/send'&&sent.body.channel==='dnd'&&sent.body.from==='RENTrust'&&sent.body.to==='2348031234567'&&/\d{6}/.test(sent.body.sms)&&!/'/.test(sent.body.sms),sent.body);
r=await call('/account/otp/verify',{method:'POST',token:pu,body:{channel:'PHONE',code:termiiCode()}}); ok('SMS code confirms the phone',r.status===200&&r.data.phoneVerified===true,r);
const pu2=(await call('/auth/register',{method:'POST',body:{email:'phone2'+Date.now()+'@example.test',phone:'+234 805 000 0001',password:'password123',role:'SEEKER',profile:{firstName:'Pat',lastName:'Two'}}})).data.token;
termiiFails=true; r=await call('/account/otp/send',{method:'POST',token:pu2,body:{channel:'PHONE'}});
ok('Termii refusal shows a retry message',r.status===502&&r.data.error.code==='PHONE_NOT_SENT'&&/SMS instead/.test(r.data.error.message),r);
r=await call('/account/otp/send',{method:'POST',token:pu2,body:{channel:'PHONE',via:'SMS'}}); ok('+234 numbers are accepted',r.status===200&&termii.at(-1).body.to==='2348050000001',termii.at(-1).body);
fakeTermii.close();
// the server log (smoke.sh saves it to SERVER_LOG)
if(process.env.SERVER_LOG){
  const logText=readFileSync(process.env.SERVER_LOG,'utf8');
  ok('log: startup says email is off and why',/WARN  Email is OFF: add RESEND_API_KEY and EMAIL_FROM.*missing=\["RESEND_API_KEY","EMAIL_FROM"\]/.test(logText),logText.slice(0,600));
  ok('log: each request with id, time and user',/INFO  GET \/api\/v1\/listings 200 \[[0-9a-f]{8}\] ms=\d+ userId=[0-9a-f-]{36}/.test(logText));
  ok('log: refused requests are warnings',/WARN  POST \/api\/v1\/auth\/login 401/.test(logText));
  ok('log: health checks are skipped',!logText.includes('/api/v1/health'));
  ok('log: character reports are traced',logText.includes('character report ready'));
  ok('log: Termii sends and refusals are logged',/INFO  phone code sent.*via=WHATSAPP.*to=234803\*+67/.test(logText)&&/ERROR phone code not sent.*Insufficient balance/.test(logText));
  ok('log: no unexpected errors',!/ERROR (?!phone code not sent|POST \/api\/v1\/account\/otp\/send 502)/.test(logText),logText.split('\n').filter(l=>l.includes('ERROR')).slice(0,5));
}
console.log(fails?`\n${fails} FAILED`:'\nALL PASSED'); process.exit(fails?1:0);
