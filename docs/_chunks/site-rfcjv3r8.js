import{tt}from"./site-8x68wnvm.js";import{P,mt}from"./site-a1xnpyy6.js";import{o}from"./site-39snrr7g.js";class Xp extends tt{constructor(e){super(e);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",mt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function Yp(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",Xp)}Yp();
export{Xp,Yp};

//# debugId=E988B12C21689AFC64756E2164756E21
//# sourceMappingURL=site-rfcjv3r8.js.map
