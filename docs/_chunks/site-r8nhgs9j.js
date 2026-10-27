import{it}from"./site-v7dfb6ky.js";import{P,mt}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class Xp extends it{constructor(e){super(e);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",mt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function Yp(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",Xp)}Yp();
export{Xp,Yp};

//# debugId=A877F7D4EC9CBE2664756E2164756E21
//# sourceMappingURL=site-r8nhgs9j.js.map
