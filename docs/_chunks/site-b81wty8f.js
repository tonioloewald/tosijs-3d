import{tt}from"./site-bj6vxf7c.js";import{I,pt}from"./site-2dj95bre.js";import{o}from"./site-b826ahhk.js";class $p extends tt{constructor(e){super(e);this.body=this.registerDataInput("body",I),this.velocity=this.registerDataInput("velocity",pt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function jp(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",$p)}jp();
export{$p,jp};

//# debugId=5F41B9ED6E48105F64756E2164756E21
//# sourceMappingURL=site-b81wty8f.js.map
