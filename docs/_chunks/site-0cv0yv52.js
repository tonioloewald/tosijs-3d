import{tt}from"./site-y503zpga.js";import{P,pt}from"./site-davp9rnk.js";import{o}from"./site-rj733z8c.js";class $p extends tt{constructor(e){super(e);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",pt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function jp(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",$p)}jp();
export{$p,jp};

//# debugId=F275D65223CAC8B264756E2164756E21
//# sourceMappingURL=site-0cv0yv52.js.map
