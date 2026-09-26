import{tt}from"./site-5tw2831p.js";import{I,pt}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class Gp extends tt{constructor(e){super(e);this.body=this.registerDataInput("body",I),this.velocity=this.registerDataInput("velocity",pt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function zp(){if(i)return;i=!0,a("FlowGraphSetLinearVelocityBlock",Gp)}zp();
export{Gp,zp};

//# debugId=4F57E0607EA4B3AF64756E2164756E21
//# sourceMappingURL=site-vx6aynkk.js.map
