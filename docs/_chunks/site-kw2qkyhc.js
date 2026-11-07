import{it}from"./site-ktydmw50.js";import{O,mt}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class im extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.velocity=this.registerDataInput("velocity",mt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function rm(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",im)}rm();
export{im,rm};

//# debugId=EA0C26311115A09A64756E2164756E21
//# sourceMappingURL=site-kw2qkyhc.js.map
