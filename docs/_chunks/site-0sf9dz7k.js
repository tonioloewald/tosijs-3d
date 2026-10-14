import{tt}from"./site-kqwawvd6.js";import{P,pt}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class Xp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.impulse=this.registerDataInput("impulse",pt),this.location=this.registerDataInput("location",pt)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),r=this.location.getValue(t);e.applyImpulse(s,r),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function Yp(){if(i)return;i=!0,o("FlowGraphApplyImpulseBlock",Xp)}Yp();
export{Xp,Yp};

//# debugId=187B0483BE69B80364756E2164756E21
//# sourceMappingURL=site-0sf9dz7k.js.map
