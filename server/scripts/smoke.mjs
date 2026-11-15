// End-to-end check of every API feature: sign-up, checks, properties, moderation, marketplace,
// interests, notifications and admin. Run it with `npm run smoke` (see smoke.sh), which gives it
// a fresh throwaway database. When you add a feature, add its checks at the bottom.
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
for(const channel of ['EMAIL','PHONE']){ r=await call('/account/otp/send',{method:'POST',token:nu,body:{channel}}); const code=r.data.testCode; let w=await call('/account/otp/verify',{method:'POST',token:nu,body:{channel,code:'000000'===code?'111111':'000000'}}); ok('wrong otp '+channel,w.status===400,w); r=await call('/account/otp/verify',{method:'POST',token:nu,body:{channel,code}}); ok('otp '+channel,r.status===200,r); }
r=await call('/account/verification',{method:'POST',token:nu,body:{idType:'NIN',idNumber:'12345678901',dateOfBirth:'1990-05-01'}}); ok('verification before consents 400',r.status===400,r);
r=await call('/account/consents',{method:'POST',token:nu,body:{kinds:['TERMS_OF_SERVICE','PRIVACY_POLICY']}}); ok('consents',r.status===201,r);
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
console.log(fails?`\n${fails} FAILED`:'\nALL PASSED'); process.exit(fails?1:0);
