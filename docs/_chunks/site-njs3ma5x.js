import{it}from"./site-3hzw4f8j.js";import{O,mt}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Qp extends it{constructor(e){super(e);this.body=this.registerDataInput("body",O),this.velocity=this.registerDataInput("velocity",mt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function qp(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",Qp)}qp();
export{Qp,qp};

//# debugId=F6894BD47EAC0EBF64756E2164756E21
//# sourceMappingURL=site-njs3ma5x.js.map
