import{tt}from"./site-2t6wdrsc.js";import{I,pt}from"./site-sy6g2f03.js";import{o}from"./site-pz63xeyn.js";class $p extends tt{constructor(e){super(e);this.body=this.registerDataInput("body",I),this.velocity=this.registerDataInput("velocity",pt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function jp(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",$p)}jp();
export{$p,jp};

//# debugId=5F41B9ED6E48105F64756E2164756E21
//# sourceMappingURL=site-01gm2fdb.js.map
