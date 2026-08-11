import{Ut as z}from"./site-2z5azex9.js";import{ku as u,mu as v}from"./site-5mc4escc.js";import{sE as q}from"./site-tvqrtn5a.js";class A extends z{constructor(b){super(b);this.body=this.registerDataInput("body",u),this.motionType=this.registerDataInput("motionType",v,2)}_execute(b,D){let j=this.body.getValue(b);if(!j){this._reportError(b,"No physics body provided"),this.out._activateSignal(b);return}j.setMotionType(this.motionType.getValue(b)),this.out._activateSignal(b)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var m=!1;function C(){if(m)return;m=!0,q("FlowGraphSetPhysicsMotionTypeBlock",A)}C();
export{A as dn,C as en};

//# debugId=5BCD250970C953AC64756E2164756E21
//# sourceMappingURL=site-0s2jmzqy.js.map
