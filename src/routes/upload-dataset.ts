// .post(
//   '/dataset',
//   ({ database, body }) => {
//     const bank = body.bank.map(item => ({
//       kind: body.kind,
//       question: item.Question,
//       solution: item.Solution,
//       test: item.Test,
//     }));
//     return database.datasets.updateOne(
//       { id: body.id },
//       {
//         $push: { bank: { $each: bank } },
//         $setOnInsert: {
//           id: body.id,
//           name: body.name,
//         },
//       },
//       { upsert: true },
//     );
//   },
//   {
//     body: t.Object({
//       id: t.String(),
//       kind: t.String(),
//       name: t.String(),
//       bank: t.Array(
//         t.Object({
//           Question: t.String(),
//           Solution: t.String(),
//           Test: t.String(),
//         }),
//       ),
//     }),
//   },
// )
