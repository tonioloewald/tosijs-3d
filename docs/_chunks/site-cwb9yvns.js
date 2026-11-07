import{it}from"./site-ktydmw50.js";import{O,V}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class sm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function nm(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",sm)}nm();
export{sm,nm};

//# debugId=2FA70688A75A695964756E2164756E21
//# sourceMappingURL=site-cwb9yvns.js.map
