const { REST, Routes } = require('discord.js');

const commands = [
  { name: 'config', description: '⚙️ Configurações do sistema' },
  { name: 'criar-painel', description: '🏪 Cria o painel principal da loja' },
  { name: 'add-produto', description: '➕ Adiciona novo produto', options: [
    {name:'nome',type:3,description:'Nome do produto',required:true},
    {name:'preco',type:10,description:'Preço R$',required:true},
    {name:'descricao',type:3,description:'Descrição curta',required:true},
    {name:'conteudo',type:3,description:'O que será entregue',required:true},
    {name:'categoria',type:3,description:'Categoria (games/contas/outros)'}
  ]},
  { name: 'cupom', description: '🎟️ Criar cupom de desconto', options: [
    {name:'codigo',type:3,description:'Código do cupom',required:true},
    {name:'desconto',type:10,description:'% de desconto',required:true},
    {name:'limite',type:4,description:'Quantas vezes pode ser usado'}
  ]}
];

const rest = new REST({ version: '10' }).setToken("COLA_SEU_NOVO_TOKEN_AQUI");

(async () => {
  try {
    console.log('Registrando comandos...');
    await rest.put(Routes.applicationGuildCommands("1508139208764686337", "1237516902692032563"), { body: commands });
    console.log('✅ Comandos registrados com sucesso!');
  } catch (error) { console.error(error); }
})();


