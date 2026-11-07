import{it}from"./site-ktydmw50.js";import{O,mt}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class em extends it{constructor(e){super(e);this.body=this.registerDataInput("body",O),this.velocity=this.registerDataInput("velocity",mt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function tm(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",em)}tm();
export{em,tm};

//# debugId=E41CAA745EF3442164756E2164756E21
//# sourceMappingURL=site-d7rbaqw7.js.map
