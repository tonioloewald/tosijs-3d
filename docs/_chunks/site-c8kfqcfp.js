import{it}from"./site-x0v5x8t1.js";import{w,mt}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class um extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.velocity=this.registerDataInput("velocity",mt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function hm(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",um)}hm();
export{um,hm};

//# debugId=23312BBDE3CBC51764756E2164756E21
//# sourceMappingURL=site-c8kfqcfp.js.map
