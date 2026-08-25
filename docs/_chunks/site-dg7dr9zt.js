import{Ut as p}from"./site-ktyw28d4.js";import{ku as r,mu as s}from"./site-86tpqddf.js";import{sE as i}from"./site-yf4sr5jd.js";class a extends p{constructor(t){super(t);this.body=this.registerDataInput("body",r),this.motionType=this.registerDataInput("motionType",s,2)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var o=!1;function h(){if(o)return;o=!0,i("FlowGraphSetPhysicsMotionTypeBlock",a)}h();
export{a as dn,h as en};

//# debugId=D720A8149E55DD1464756E2164756E21
//# sourceMappingURL=site-dg7dr9zt.js.map
