import{Qe}from"./site-z8mqhr1b.js";import{R,B}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Md extends Qe{constructor(t){super(t);this.body=this.registerDataInput("body",R),this.motionType=this.registerDataInput("motionType",B,2)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var o=!1;function wd(){if(o)return;o=!0,a("FlowGraphSetPhysicsMotionTypeBlock",Md)}wd();
export{Md,wd};

//# debugId=07F7491D01BB6F4C64756E2164756E21
//# sourceMappingURL=site-9sf1348m.js.map
