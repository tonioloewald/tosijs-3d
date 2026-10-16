import{tt}from"./site-n1qmzpg8.js";import{P,pt}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class Xp extends tt{constructor(e){super(e);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",pt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function Yp(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",Xp)}Yp();
export{Xp,Yp};

//# debugId=C7A776A04D04F5B264756E2164756E21
//# sourceMappingURL=site-epcdt7gd.js.map
