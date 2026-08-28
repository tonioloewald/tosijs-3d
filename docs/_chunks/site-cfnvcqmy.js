import{Ts as p}from"./site-nv8skz8z.js";import{jt as r,lt as s}from"./site-bab0thfc.js";import{fG as i}from"./site-pcap36fe.js";class a extends p{constructor(t){super(t);this.body=this.registerDataInput("body",r),this.motionType=this.registerDataInput("motionType",s,2)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var o=!1;function h(){if(o)return;o=!0,i("FlowGraphSetPhysicsMotionTypeBlock",a)}h();
export{a as nn,h as on};

//# debugId=C7220999743D75A564756E2164756E21
//# sourceMappingURL=site-cfnvcqmy.js.map
