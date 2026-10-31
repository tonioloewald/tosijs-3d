import{it}from"./site-3hzw4f8j.js";import{O,mt}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Zp extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.velocity=this.registerDataInput("velocity",mt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function Kp(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",Zp)}Kp();
export{Zp,Kp};

//# debugId=DCCAAF78B7F0AF0464756E2164756E21
//# sourceMappingURL=site-kakjznxz.js.map
